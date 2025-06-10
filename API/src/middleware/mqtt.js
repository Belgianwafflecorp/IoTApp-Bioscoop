import mqtt from 'mqtt';

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const mqttClient = mqtt.connect(MQTT_BROKER_URL);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
});

export function publishSeatUpdate(screeningId, data) {
  const topic = `screening/${screeningId}/seats`;
  mqttClient.publish(topic, JSON.stringify(data));
}