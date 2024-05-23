require('dotenv').config();
const Hapi = require('@hapi/hapi');
const { loadModel, predict } = require('./inference');
const storeData = require('./firestore');
const InputError = require("../exceptions/InputError");

(async () => {
  const { nanoid } = await import('nanoid');
  // load and get machine learning model
  const model = await loadModel();
  console.log('model loaded!');
  // initializing HTTP server
  const server = Hapi.server({
    port: 3000,
    host: '0.0.0.0',
    routes: {
        cors: {
          origin: ['*'],
        },
    },
});
 
  server.ext("onPreResponse", function (request, h) {
    const response = request.response;

    if (response instanceof InputError) {
        const newResponse = h.response({
            status: "fail",
            message: "Terjadi kesalahan dalam melakukan prediksi",
        });
        newResponse.code(400);
        return newResponse;
    }

    if (response.isBoom) {
        const newResponse = h.response({
            status: "fail",
            message: response.message,
        });

        newResponse.code(413);
        return newResponse;
    }

    return h.continue;
  });

  server.route({
    method: 'POST',
    path: '/predicts',
    handler: async (request, h) => {
      // get image that uploaded by user
      const { image } = request.payload;
      // do and get prediction result by giving model and image
      const predictions = await predict(model, image);
      // get prediction result
      const result = predictions;

      const label = result >= 0.5 ? "Cancer" : "Non-cancer";
      const suggestion = label === "Cancer" ? "Segera periksa ke dokter!" : "Tidak ada indikasi!";
      const id = nanoid(16);
      const createdAt = new Date().toISOString();

      const data = {
        id: id,
        result: label,
        suggestion: suggestion,
        createdAt: createdAt,
      }
      
      await storeData(id, data);

      const response = h.response({
        status: "success",
        message: "Model is predicted successfully",
        data,
      });

      response.code(201);
      return response;
      
    },
    // make request payload as `multipart/form-data` to accept file upload
    options: {
      payload: {
        allow: 'multipart/form-data',
        multipart: true,
      }
    }
  });
 
  // running server
  await server.start();
 
  console.log(`Server start at: ${server.info.uri}`);
})();