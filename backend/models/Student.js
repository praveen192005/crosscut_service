const mongoose = require('mongoose');

const uniformSetSchema = new mongoose.Schema(
  {
    setNumber: { type: Number, required: true },
    uniformType: { type: String, default: '' },
    sportsColor: { type: String, default: '' },
    status: { type: String, default: 'Not Issued' },
    topSize: { type: String, default: '' },
    bottomSize: { type: String, default: '' },
    issueDate: { type: Date, default: null },
    reasonIfMissing: { type: String, default: '' }
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Boys', 'Girls', 'Unisex'],
      required: [true, 'Gender is required'],
    },
    grade: {
      type: String,
      required: [true, 'Grade/Class is required'],
      trim: true,
    },
    sets: [uniformSetSchema],
  },
  {
    timestamps: true,
  }
);

studentSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  }
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
