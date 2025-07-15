const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskSphere Express API',
      version: '1.0.0',
      description: 'TaskSphere API documented with Swagger. Includes authentication endpoints using Supabase.',
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Auth',
        description: 'User authentication endpoints (signup, login, logout)'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
