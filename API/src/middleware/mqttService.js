// middleware/mqttService.js
import mqtt from 'mqtt';

let client;

/**
 * Initializes the MQTT client and connects to the broker.
 * @param {string} brokerUrl - The URL of the MQTT broker (e.g., 'mqtt://localhost:1883').
 */
const connectMqtt = (brokerUrl) => {
  client = mqtt.connect(brokerUrl);

  client.on('connect', () => {
    console.log('Connected to MQTT broker');
  });

  client.on('error', (err) => {
    console.error('MQTT error:', err);
    client.end(); // Close the client on error
  });

  client.on('reconnect', () => {
    console.log('MQTT reconnecting...');
  });

  client.on('close', () => {
    console.log('MQTT connection closed.');
  });
};

/**
 * Publishes a message to a specific MQTT topic.
 * @param {string} topic - The MQTT topic to publish to.
 * @param {object} message - The JavaScript object to publish (will be stringified to JSON).
 */
const publishMqttMessage = (topic, message) => {
  if (client && client.connected) {
    client.publish(topic, JSON.stringify(message), (err) => {
      if (err) {
        console.error('Failed to publish MQTT message:', err);
      } else {
        console.log(`Published to topic "${topic}":`, message);
      }
    });
  } else {
    console.warn('MQTT client not connected. Message not published.');
  }
};

export { connectMqtt, publishMqttMessage };