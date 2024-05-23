const tfjs = require('@tensorflow/tfjs-node');

function loadModel() {
  // const modelUrl = "file://models/model.json";
  return tf.loadGraphModel(process.env.MODEL_URL);
}

function predict(model, imageBuffer) {
    const tensor = tfjs.node
      .decodeJpeg(imageBuffer)
      .resizeNearestNeighbor([224, 224])
      .expandDims()
      .toFloat();
   
    return model.predict(tensor).data();
}

module.exports = { loadModel, predict };