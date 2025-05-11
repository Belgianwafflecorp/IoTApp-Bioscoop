import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Bioscoop App API Documentation",
            version: "1.0.0",
            description: "API documentation for Bioscoop App",
        },
        servers: [
            {
                url: "http://localhost:3000", 
                description: "Local server",
            },
        ],
    },
    apis: [
        "./src/routes/apiRoutes.js", 
    ],
};

const swaggerSpec = swaggerJsDoc(options);

function swaggerDocs(app, port) {
    // Swagger UI page
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Docs in JSON format
    app.get('/docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    console.log(`Docs available at http://localhost:${port}/docs`);
    console.log(`Docs in JSON format available at http://localhost:${port}/docs.json`);
}

export default swaggerDocs;