const express = require('express');
const router = express.Router();
const {
  getStudents,
  addStudent,
  updateStudent,
  bulkImportStudents,
  issueUniformSet,
  deleteStudent,
  deleteAllStudents,
  deleteRequest,
  deleteAllRequests,
} = require('../controllers/studentController');

router.route('/')
  .get(getStudents)
  .post(addStudent);

router.post('/bulk-import', bulkImportStudents);
router.post('/issue', issueUniformSet);
router.delete('/all', deleteAllStudents);
router.delete('/requests/all', deleteAllRequests);

router.route('/:id')
  .put(updateStudent)
  .delete(deleteStudent);

router.delete('/:id/request/:setNumber', deleteRequest);

module.exports = router;

