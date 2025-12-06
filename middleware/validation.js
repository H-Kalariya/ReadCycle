const Joi = require('joi');
const config = require('../config');

// Common validation schemas
const schemas = {
  user: {
    signup: Joi.object({
      fullname: Joi.string()
        .min(config.name.minLength)
        .max(config.name.maxLength)
        .pattern(config.name.regex)
        .required()
        .messages({
          'string.pattern.base': 'Full name can only contain letters, spaces, hyphens, and apostrophes',
          'string.empty': 'Full name is required',
          'any.required': 'Full name is required'
        }),
      userid: Joi.string()
        .min(config.userid.minLength)
        .max(config.userid.maxLength)
        .pattern(config.userid.regex)
        .required()
        .messages({
          'string.pattern.base': 'User ID must be 3-20 characters long and contain only letters and numbers',
          'string.empty': 'User ID is required',
          'any.required': 'User ID is required'
        }),
      no: Joi.string()
        .pattern(config.phone.regex)
        .required()
        .messages({
          'string.pattern.base': 'Please enter a valid phone number',
          'string.empty': 'Phone number is required',
          'any.required': 'Phone number is required'
        }),
      email: Joi.string()
        .email()
        .pattern(config.email.regex)
        .required()
        .messages({
          'string.email': 'Please enter a valid email address',
          'string.empty': 'Email is required',
          'any.required': 'Email is required'
        }),
      address: Joi.string()
        .min(5)
        .max(200)
        .required()
        .messages({
          'string.empty': 'Address is required',
          'any.required': 'Address is required',
          'string.min': 'Address must be at least 5 characters long',
          'string.max': 'Address cannot be longer than 200 characters'
        }),
      password: Joi.string()
        .min(config.passwordMinLength)
        .required()
        .messages({
          'string.empty': 'Password is required',
          'any.required': 'Password is required',
          'string.min': `Password must be at least ${config.passwordMinLength} characters long`
        }),
      verifyPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
          'any.only': 'Passwords do not match',
          'any.required': 'Please confirm your password'
        })
    }),
    
    login: Joi.object({
      identifier: Joi.string().required().messages({
        'string.empty': 'Email or User ID is required',
        'any.required': 'Email or User ID is required'
      }),
      password: Joi.string().required().messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
      })
    }),
    
    book: Joi.object({
      title: Joi.string().required().min(2).max(100).messages({
        'string.empty': 'Book title is required',
        'any.required': 'Book title is required',
        'string.min': 'Book title must be at least 2 characters long',
        'string.max': 'Book title cannot be longer than 100 characters'
      }),
      author: Joi.string().required().min(2).max(100).messages({
        'string.empty': 'Author name is required',
        'any.required': 'Author name is required',
        'string.min': 'Author name must be at least 2 characters long',
        'string.max': 'Author name cannot be longer than 100 characters'
      }),
      genre: Joi.string().allow('').optional(),
      condition: Joi.string().allow('').optional(),
      isbn: Joi.string().allow('').optional(),
      description: Joi.string().allow('').optional()
    })
  }
};

// Validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace req[source] with the validated and sanitized value
    req[source] = value;
    next();
  };
};

module.exports = {
  schemas,
  validate
};
