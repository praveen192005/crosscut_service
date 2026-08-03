const express = require('express');
const router = express.Router();
const { getBills, createBill, payBill, deleteBill, deleteAllBills } = require('../controllers/billController');

router.route('/')
  .get(getBills)
  .post(createBill);

router.delete('/all', deleteAllBills);
router.put('/:id/pay', payBill);
router.delete('/:id', deleteBill);

module.exports = router;
