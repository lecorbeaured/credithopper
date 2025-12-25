// ===========================================
// CREDITHOPPER - MIDDLEWARE INDEX
// ===========================================

const auth = require('./auth');
const upload = require('./upload');

module.exports = {
  ...auth,
  ...upload,
};
