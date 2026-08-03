const express = require('express');
const router = express.Router();
const { getStocks, addStock, deleteStock, deleteAllStocks } = require('../controllers/stockController');

router.route('/')
  .get(getStocks)
  .delete(deleteStock);

router.post('/add', addStock);
router.delete('/all', deleteAllStocks);

module.exports = router;
