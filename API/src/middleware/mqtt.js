    import mqtt from 'mqtt';

    const subscriptions = new Map();
    let mqttClient = null;

    function setupMQTT() {
    const mqttHost = process.env.MQTT_HOST || 'localhost';
    const mqttPort = process.env.MQTT_PORT || '1883';
    console.log('Connecting to MQTT broker at:', `mqtt://${mqttHost}:${mqttPort}`);
    mqttClient = mqtt.connect(`mqtt://${mqttHost}:${mqttPort}`);

    mqttClient.on('connect', () => {
        console.log('Connected to MQTT broker');
    });

    mqttClient.on('error', (err) => {
        console.error('MQTT error:', err);
    });
    }

    function subscribeToScreening(screeningId, onMessage) {
    const topic = `screening/${screeningId}/update`;
    if (!subscriptions.has(screeningId)) {
        mqttClient.subscribe(topic, (err) => {
        if (err) {
            console.error('MQTT subscribe error:', err);
        } else {
            subscriptions.set(screeningId, onMessage);
        }
        });
    }
    mqttClient.on('message', (topicMsg, message) => {
        if (topicMsg === topic && typeof onMessage === 'function') {
        onMessage(JSON.parse(message.toString()));
        }
    });
    }

    function broadcastUpdate(screeningId, data) {
    const topic = `screening/${screeningId}/update`;
    console.log(`[MQTT] Publishing to topic: ${topic}`);
    console.log(`[MQTT] Data:`, JSON.stringify({ type: 'update', data }));
    mqttClient.publish(topic, JSON.stringify({ type: 'update', data }), { retain: true });
    }

    export default setupMQTT;
    export { subscribeToScreening, broadcastUpdate };
