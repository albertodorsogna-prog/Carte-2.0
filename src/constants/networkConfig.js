export const STORAGE_HOST_KEY = 'osteria_host_saved_state_v4';
export const STORAGE_PEER_ID_KEY = 'osteria_my_peer_id_v4';

// Prefissi dei canali di comunicazione
export const MQTT_TOPIC_PREFIX = 'osteria_v4_room_';
export const BROADCAST_CHANNEL_PREFIX = 'osteria_room_';
export const PEER_ID_PREFIX = 'osteria-p2p-';

// Broker WebSocket Cloud pubblici (passano sempre su 4G/5G e Wi-Fi senza blocchi NAT)
export const MQTT_BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt'
];

// Configurazione STUN + TURN gratuiti per PeerJS
export const PEER_ICE_CONFIG = {
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ]
    }
};