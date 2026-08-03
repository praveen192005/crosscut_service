const express = require('express');
const router = express.Router();
const { seedDatabase, clearAllData } = require('../controllers/seedController');

router.post('/', seedDatabase);
router.post('/clear', clearAllData);
router.delete('/clear', clearAllData);

module.exports = router;
