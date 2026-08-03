const Stock = require('../models/Stock');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const User = require('../models/User');

const DEFAULT_STOCKS = [
  { branch: 'BBLI', uniformType: 'Yellow Uniform', uniformPart: 'Top', gender: 'Boys', size: '28', received: 50, issued: 12, remaining: 38 },
  { branch: 'BBLI', uniformType: 'Yellow Uniform', uniformPart: 'Bottom', gender: 'Boys', size: '28', received: 50, issued: 12, remaining: 38 },
  { branch: 'BBLI', uniformType: 'Yellow Uniform', uniformPart: 'Top', gender: 'Boys', size: '30', received: 60, issued: 45, remaining: 15 },
  { branch: 'BBLI', uniformType: 'Yellow Uniform', uniformPart: 'Bottom', gender: 'Boys', size: '30', received: 60, issued: 45, remaining: 15 },
  { branch: 'BBLI', uniformType: 'Yellow Uniform', uniformPart: 'Top', gender: 'Boys', size: '32', received: 40, issued: 30, remaining: 10 },
  { branch: 'BBLI', uniformType: 'Yellow Uniform', uniformPart: 'Bottom', gender: 'Boys', size: '32', received: 40, issued: 30, remaining: 10 },
  { branch: 'BBLI', uniformType: 'Red Uniform', uniformPart: 'Top', gender: 'Girls', size: '28', received: 50, issued: 20, remaining: 30 },
  { branch: 'BBLI', uniformType: 'Red Uniform', uniformPart: 'Bottom', gender: 'Girls', size: '28', received: 50, issued: 20, remaining: 30 },
  { branch: 'BBLI', uniformType: 'Red Uniform', uniformPart: 'Top', gender: 'Girls', size: '30', received: 55, issued: 35, remaining: 20 },
  { branch: 'BBLI', uniformType: 'Red Uniform', uniformPart: 'Bottom', gender: 'Girls', size: '30', received: 55, issued: 35, remaining: 20 },
  { branch: 'BBCS', uniformType: 'Sports Uniform (B)', uniformPart: 'Top', gender: 'Boys', size: '30', received: 80, issued: 75, remaining: 5 },
  { branch: 'BBCS', uniformType: 'Sports Uniform (B)', uniformPart: 'Bottom', gender: 'Boys', size: '30', received: 80, issued: 75, remaining: 5 },
  { branch: 'BBCS', uniformType: 'Sports Uniform (S)', uniformPart: 'Top', gender: 'Boys', size: '32', received: 70, issued: 40, remaining: 30 },
  { branch: 'BBCS', uniformType: 'Sports Uniform (S)', uniformPart: 'Bottom', gender: 'Boys', size: '32', received: 70, issued: 40, remaining: 30 },
  { branch: 'BBMS', uniformType: 'Yellow Uniform', uniformPart: 'Top', gender: 'Boys', size: '30', received: 30, issued: 28, remaining: 2 },
  { branch: 'BBMS', uniformType: 'Yellow Uniform', uniformPart: 'Bottom', gender: 'Boys', size: '30', received: 30, issued: 28, remaining: 2 },
];

const DEFAULT_STUDENTS = [
  {
    name: 'Aarav Patel',
    branch: 'BBLI',
    gender: 'Boys',
    grade: '3 (BRAIN)',
    sets: [
      { setNumber: 1, uniformType: 'Yellow Uniform', status: 'Issued', topSize: '28', bottomSize: '28', issueDate: new Date(), reasonIfMissing: '' },
      { setNumber: 2, uniformType: 'Red Uniform', status: 'Issued', topSize: '28', bottomSize: '28', issueDate: new Date(), reasonIfMissing: '' },
      { setNumber: 3, uniformType: 'Sports Uniform', sportsColor: 'B', status: 'Not Issued', topSize: '', bottomSize: '', issueDate: null, reasonIfMissing: '' }
    ]
  },
  {
    name: 'Diya Sharma',
    branch: 'BBLI',
    gender: 'Girls',
    grade: '5 (BRAIN)',
    sets: [
      { setNumber: 1, uniformType: 'Yellow Uniform', status: 'Issued', topSize: '30', bottomSize: '30', issueDate: new Date(), reasonIfMissing: '' },
      { setNumber: 2, uniformType: 'Red Uniform', status: 'Size Pending', topSize: '30', bottomSize: '30', issueDate: null, reasonIfMissing: 'Size 30 out of stock' },
      { setNumber: 3, uniformType: 'Sports Uniform', sportsColor: 'E', status: 'Not Issued', topSize: '', bottomSize: '', issueDate: null, reasonIfMissing: '' }
    ]
  },
  {
    name: 'Kabir Mehta',
    branch: 'BBCS',
    gender: 'Boys',
    grade: 'Grade 6',
    sets: [
      { setNumber: 1, uniformType: 'Yellow Uniform', status: 'Issued', topSize: '30', bottomSize: '30', issueDate: new Date(), reasonIfMissing: '' },
      { setNumber: 2, uniformType: 'Red Uniform', status: 'Issued', topSize: '32', bottomSize: '32', issueDate: new Date(), reasonIfMissing: '' },
      { setNumber: 3, uniformType: 'Sports Uniform', sportsColor: 'S', status: 'Issued', topSize: '32', bottomSize: '32', issueDate: new Date(), reasonIfMissing: '' }
    ]
  }
];

const seedDatabase = async (req, res) => {
  try {
    const stockCount = await Stock.countDocuments();
    if (stockCount === 0) {
      await Stock.insertMany(DEFAULT_STOCKS);
    }

    const studentCount = await Student.countDocuments();
    if (studentCount === 0) {
      await Student.insertMany(DEFAULT_STUDENTS);
    }

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create([
        { username: 'admin', role: 'admin', password: 'admin123' },
        { username: 'cashier', role: 'cashier', password: 'cashier123' },
        { username: 'staff', role: 'staff', password: 'staff123' }
      ]);
    }

    res.status(200).json({
      success: true,
      message: 'MongoDB database initialized/seeded successfully',
      counts: {
        stocks: await Stock.countDocuments(),
        students: await Student.countDocuments(),
        users: await User.countDocuments(),
        bills: await Bill.countDocuments(),
        transactions: await Transaction.countDocuments(),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const clearAllData = async (req, res) => {
  try {
    await Stock.deleteMany({});
    await Student.deleteMany({});
    await Transaction.deleteMany({});
    await Bill.deleteMany({});

    res.status(200).json({
      success: true,
      message: 'All stocks, students, transactions, and bills cleared from MongoDB database',
      counts: {
        stocks: 0,
        students: 0,
        transactions: 0,
        bills: 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { seedDatabase, clearAllData };
