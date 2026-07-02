const Joi = require("joi");

// =============================================
// VALIDATION SCHEMAS - Kiểm tra input người dùng
// =============================================

/**
 * Hàm helper: chạy schema và trả lỗi chuẩn
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: false });
  if (error) {
    const messages = error.details.map((d) => d.message.replace(/"/g, "'"));
    return res.status(400).json({
      success: false,
      message: "Dữ liệu không hợp lệ.",
      errors: messages
    });
  }
  next();
};

// =============================================
// SCHEMAS
// =============================================

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    "string.min": "Tên phải có ít nhất 2 ký tự.",
    "string.max": "Tên không được vượt quá 50 ký tự.",
    "any.required": "Tên là bắt buộc."
  }),
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "Email không đúng định dạng.",
    "any.required": "Email là bắt buộc."
  }),
  password: Joi.string().min(6).max(72).required().messages({
    "string.min": "Mật khẩu phải có ít nhất 6 ký tự.",
    "any.required": "Mật khẩu là bắt buộc."
  }),
  age: Joi.number().integer().min(10).max(100).required().messages({
    "number.min": "Tuổi phải từ 10 trở lên.",
    "number.max": "Tuổi không hợp lệ.",
    "any.required": "Tuổi là bắt buộc."
  }),
  gender: Joi.string().valid("male", "female").required().messages({
    "any.only": "Giới tính phải là 'male' hoặc 'female'.",
    "any.required": "Giới tính là bắt buộc."
  }),
  height: Joi.number().min(100).max(250).required().messages({
    "number.min": "Chiều cao không hợp lệ (phải từ 100cm).",
    "number.max": "Chiều cao không hợp lệ (tối đa 250cm).",
    "any.required": "Chiều cao là bắt buộc."
  }),
  weight: Joi.number().min(20).max(300).required().messages({
    "number.min": "Cân nặng không hợp lệ (phải từ 20kg).",
    "number.max": "Cân nặng không hợp lệ (tối đa 300kg).",
    "any.required": "Cân nặng là bắt buộc."
  }),
  goal: Joi.string().valid("lose_weight", "gain_muscle", "maintain").required().messages({
    "any.only": "Mục tiêu phải là lose_weight, gain_muscle hoặc maintain.",
    "any.required": "Mục tiêu là bắt buộc."
  }),
  fitnessLevel: Joi.string().valid("beginner", "intermediate", "advanced").required().messages({
    "any.only": "Trình độ phải là beginner, intermediate hoặc advanced.",
    "any.required": "Trình độ tập luyện là bắt buộc."
  }),
  workoutLocation: Joi.string().valid("home", "gym").default("home"),
  availableEquipment: Joi.array()
    .items(Joi.string().valid("bodyweight", "dumbbells", "pull_up_bar", "resistance_bands", "none"))
    .default([]),
  medicalConditions: Joi.alternatives()
    .try(Joi.array().items(Joi.string().max(200)), Joi.string().max(500))
    .optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "Email không đúng định dạng.",
    "any.required": "Email là bắt buộc."
  }),
  password: Joi.string().min(1).required().messages({
    "any.required": "Mật khẩu là bắt buộc."
  })
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    "any.required": "Mật khẩu cũ là bắt buộc."
  }),
  newPassword: Joi.string().min(6).max(72).required().messages({
    "string.min": "Mật khẩu mới phải có ít nhất 6 ký tự.",
    "any.required": "Mật khẩu mới là bắt buộc."
  })
});

const postSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required().messages({
    "string.min": "Nội dung bài viết không được để trống.",
    "string.max": "Nội dung bài viết tối đa 2000 ký tự.",
    "any.required": "Nội dung là bắt buộc."
  }),
  workoutLogId: Joi.string().hex().length(24).optional().allow("", null),
  dietLogId: Joi.string().hex().length(24).optional().allow("", null)
});

const commentSchema = Joi.object({
  content: Joi.string().trim().min(1).max(500).required().messages({
    "string.min": "Bình luận không được để trống.",
    "string.max": "Bình luận tối đa 500 ký tự.",
    "any.required": "Nội dung bình luận là bắt buộc."
  })
});

const weightLogSchema = Joi.object({
  weight: Joi.number().min(20).max(300).required().messages({
    "number.min": "Cân nặng không hợp lệ.",
    "number.max": "Cân nặng không hợp lệ.",
    "any.required": "Cân nặng là bắt buộc."
  }),
  date: Joi.date().iso().optional()
});

const contactSchema = Joi.object({
  type: Joi.string().valid("help", "bug", "feature", "other").required().messages({
    "any.only": "Loại liên hệ không hợp lệ.",
    "any.required": "Loại liên hệ là bắt buộc."
  }),
  title: Joi.string().trim().min(5).max(200).required().messages({
    "string.min": "Tiêu đề phải có ít nhất 5 ký tự.",
    "string.max": "Tiêu đề tối đa 200 ký tự.",
    "any.required": "Tiêu đề là bắt buộc."
  }),
  content: Joi.string().trim().min(10).max(2000).required().messages({
    "string.min": "Nội dung phải có ít nhất 10 ký tự.",
    "string.max": "Nội dung tối đa 2000 ký tự.",
    "any.required": "Nội dung là bắt buộc."
  })
});


const savePostSchema = Joi.object({
  method: Joi.string().valid("ad","premium").required().messages({
    "any.only": "method phải là 'ad' hoặc 'premium'.",
    "any.required": "method là bắt buộc."
  })
});

const checkInSchema = Joi.object({
  didWorkout: Joi.boolean().required().messages({
    "boolean.base": "didWorkout phải là true hoặc false.",
    "any.required": "didWorkout là bắt buộc."
  }),
  note: Joi.string().max(500).optional().allow("")
});

const exerciseMaxSchema = Joi.object({
  exerciseId: Joi.string().hex().length(24).required().messages({
    "any.required": "exerciseId là bắt buộc."
  }),
  maxWeight: Joi.number().min(0).max(1000).required().messages({
    "any.required": "maxWeight là bắt buộc.",
    "number.min": "Cân nặng không thể âm."
  }),
  maxReps: Joi.number().integer().min(0).max(9999).required().messages({
    "any.required": "maxReps là bắt buộc."
  })
});

const availabilitySchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    "string.pattern.base": "date phải theo định dạng YYYY-MM-DD.",
    "any.required": "date là bắt buộc."
  }),
  slots: Joi.array().items(
    Joi.object({
      startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
      endTime:   Joi.string().pattern(/^\d{2}:\d{2}$/).required()
    })
  ).min(1).max(12).required(),
  isAvailable: Joi.boolean().default(true),
  location: Joi.string().max(200).optional().allow("", null),
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).optional().allow(null),
    lng: Joi.number().min(-180).max(180).optional().allow(null)
  }).optional()
});

const hireRequestSchema = Joi.object({
  ptId:            Joi.string().hex().length(24).required(),
  availabilityId:  Joi.string().hex().length(24).required(),
  slotId:          Joi.string().hex().length(24).required(),
  goal:            Joi.string().max(500).optional().allow(""),
  price:           Joi.number().min(0).max(100000000).required().messages({
    "any.required": "price là bắt buộc.",
    "number.min": "Giá không thể âm."
  })
});

const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  review: Joi.string().max(500).optional().allow("")
});

module.exports = {
  validate,
  schemas: {
    savePost: savePostSchema,
    checkIn: checkInSchema,
    exerciseMax: exerciseMaxSchema,
    availability: availabilitySchema,
    hireRequest: hireRequestSchema,
    review: reviewSchema,
    register: registerSchema,
    login: loginSchema,
    changePassword: changePasswordSchema,
    post: postSchema,
    comment: commentSchema,
    weightLog: weightLogSchema,
    contact: contactSchema
  }
};
