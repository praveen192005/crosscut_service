const Student = require('../models/Student');
const Stock = require('../models/Stock');
const Transaction = require('../models/Transaction');

// Default uniform sets logic helper
function getDefaultSets() {
  return [
    { setNumber: 1, uniformType: 'Yellow Uniform', status: 'Not Issued', topSize: '', bottomSize: '', issueDate: null, reasonIfMissing: '' },
    { setNumber: 2, uniformType: 'Red Uniform', status: 'Not Issued', topSize: '', bottomSize: '', issueDate: null, reasonIfMissing: '' },
    { setNumber: 3, uniformType: 'Sports Uniform', sportsColor: '', status: 'Not Issued', topSize: '', bottomSize: '', issueDate: null, reasonIfMissing: '' }
  ];
}

// @desc    Get all students
// @route   GET /api/students
const getStudents = async (req, res) => {
  try {
    const students = await Student.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a new student
// @route   POST /api/students
const addStudent = async (req, res) => {
  try {
    const { name, branch, gender, grade } = req.body;
    if (!name || !branch || !gender || !grade) {
      return res.status(400).json({ success: false, message: 'All student details (name, branch, gender, grade) are required' });
    }

    const student = await Student.create({
      name,
      branch,
      gender,
      grade,
      sets: getDefaultSets()
    });

    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Issue uniform set for student
// @route   POST /api/students/issue
const issueUniformSet = async (req, res) => {
  try {
    const { studentId, setNumber, status, topSize, bottomSize, sportsColor, reason, operator } = req.body;
    
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const setIndex = parseInt(setNumber, 10) - 1;
    if (setIndex < 0 || setIndex >= student.sets.length) {
      return res.status(400).json({ success: false, message: 'Invalid set number' });
    }

    const targetSet = student.sets[setIndex];
    const prevStatus = targetSet.status;

    targetSet.status = status;
    targetSet.topSize = topSize || targetSet.topSize || '';
    targetSet.bottomSize = bottomSize || targetSet.bottomSize || '';
    targetSet.reasonIfMissing = reason || '';
    if (sportsColor) {
      targetSet.sportsColor = sportsColor;
    }

    if (status === 'Issued') {
      targetSet.issueDate = new Date();
      targetSet.reasonIfMissing = '';

      // Update Stock issued count if previously not issued
      if (prevStatus !== 'Issued') {
        const uType = targetSet.uniformType || (targetSet.setNumber === 3 ? 'Sports Uniform' : 'General');
        
        if (targetSet.topSize) {
          const topStock = await Stock.findOne({
            branch: student.branch,
            uniformType: { $regex: new RegExp(uType, 'i') },
            uniformPart: 'Top',
            gender: student.gender,
            size: targetSet.topSize,
          });
          if (topStock) {
            topStock.issued += 1;
            topStock.remaining = Math.max(0, topStock.received - topStock.issued);
            await topStock.save();
          }

          await Transaction.create({
            type: 'Issue',
            branch: student.branch,
            uniformType: uType,
            uniformPart: 'Top',
            gender: student.gender,
            size: targetSet.topSize,
            quantity: 1,
            operator: operator || 'Staff',
            studentId: student._id.toString(),
            studentName: student.name,
          });
        }

        if (targetSet.bottomSize) {
          const bottomStock = await Stock.findOne({
            branch: student.branch,
            uniformType: { $regex: new RegExp(uType, 'i') },
            uniformPart: 'Bottom',
            gender: student.gender,
            size: targetSet.bottomSize,
          });
          if (bottomStock) {
            bottomStock.issued += 1;
            bottomStock.remaining = Math.max(0, bottomStock.received - bottomStock.issued);
            await bottomStock.save();
          }

          await Transaction.create({
            type: 'Issue',
            branch: student.branch,
            uniformType: uType,
            uniformPart: 'Bottom',
            gender: student.gender,
            size: targetSet.bottomSize,
            quantity: 1,
            operator: operator || 'Staff',
            studentId: student._id.toString(),
            studentName: student.name,
          });
        }
      }
    }

    await student.save();
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single student
// @route   DELETE /api/students/:id
const deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete all students
// @route   DELETE /api/students/all
const deleteAllStudents = async (req, res) => {
  try {
    await Student.deleteMany({});
    res.status(200).json({ success: true, message: 'All students deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete specific request (reset set status)
// @route   DELETE /api/students/:id/request/:setNumber
const deleteRequest = async (req, res) => {
  try {
    const { id, setNumber } = req.params;
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const idx = parseInt(setNumber, 10) - 1;
    if (student.sets && student.sets[idx]) {
      student.sets[idx].status = 'Not Issued';
      student.sets[idx].reasonIfMissing = '';
      student.sets[idx].topSize = '';
      student.sets[idx].bottomSize = '';
      await student.save();
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete all pending requests across all students
// @route   DELETE /api/students/requests/all
const deleteAllRequests = async (req, res) => {
  try {
    const students = await Student.find({});
    for (const s of students) {
      let modified = false;
      if (s.sets) {
        s.sets.forEach(set => {
          if (set.status === 'Pending Size' || set.status === 'Size Pending') {
            set.status = 'Not Issued';
            set.reasonIfMissing = '';
            set.topSize = '';
            set.bottomSize = '';
            modified = true;
          }
        });
        if (modified) {
          await s.save();
        }
      }
    }
    res.status(200).json({ success: true, message: 'All size pending requests cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStudents,
  addStudent,
  issueUniformSet,
  deleteStudent,
  deleteAllStudents,
  deleteRequest,
  deleteAllRequests,
};
