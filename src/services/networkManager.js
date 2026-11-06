import mqtt from 'mqtt';
import Peer from 'peerjs';
import {
    MQTT_BROKERS,
    PEER_ICE_CONFIG,
    MQTT_TOPIC_PREFIX,
    BROADCAST_CHANNEL_PREFIX,
    PEER_ID_PREFIX
} from '../constants/networkConfig.js';

const hostTopic = (code) => `${MQTT_TOPIC_PREFIX}${code}_host`;
const syncTopic = (code) => `${MQTT_TOPIC_PREFIX}${code}_sync`;

/**
 * Bridge unificato del multiplayer ibrido:
 *   1) MQTT Cloud su WebSocket (2 broker in parallelo) - canale principale
 *   2) PeerJS / WebRTC P2P                              - canale di supporto
 *   3) BroadcastChannel                                 - schede dello stesso browser
 */
export class NetworkManager {
    constructor() {
        this.mqttClients = [];
        this.peer = null;
        this.connections = [];   // connessioni PeerJS lato Oste
        this.hostConn = null;    // connessione PeerJS lato client
        this.bc = null;
        this.joinTimer = null;
    }

    // ------------------------------------------------------------ utilità
    closeAllMqtt() {
        this.mqttClients.forEach(cl => { try { cl.end(true); } catch (e) {} });
        this.mqttClients = [];
    }

    closeBroadcastChannel() {
        if (this.bc) {
            try { this.bc.close(); } catch (e) {}
            this.bc = null;
        }
    }

    publish(topic, payloadObj) {
        const raw = JSON.stringify(payloadObj);
        this.mqttClients.forEach(cl => {
            if (cl && cl.connected) {
                try { cl.publish(topic, raw, { qos: 0 }); } catch (e) {}
            }
        });
    }

    stopJoin() {
        if (this.joinTimer) {
            clearInterval(this.joinTimer);
            this.joinTimer = null;
        }
    }

    destroy() {
        this.stopJoin();
        this.closeAllMqtt();
        this.closeBroadcastChannel();
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }
        this.connections = [];
        this.hostConn = null;
    }

    // ------------------------------------------------------------ OSTE
    /**
     * handlers: {
     *   getState():       stato corrente di gioco
     *   onJoinRequest(playerId, playerName, reply)
     *   onAction(action)
     *   onStatus(text)
     * }
     */
    startHost(code, handlers) {
        const dispatch = (data, reply) => {
            if (!data) return;
            if (data.type === 'JOIN_REQUEST') {
                handlers.onJoinRequest(data.playerId, data.playerName, reply);
            } else if (data.type === 'PLAYER_ACTION') {
                handlers.onAction(data.action);
            } else if (data.type === 'PING_STATE') {
                reply({ type: 'SYNC_STATE', state: handlers.getState() });
            }
        };

        // A. BroadcastChannel locale
        this.closeBroadcastChannel();
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_PREFIX + code);
        bc.onmessage = (ev) => dispatch(ev.data, (reply) => { try { bc.postMessage(reply); } catch (e) {} });
        this.bc = bc;

        // B. Cloud Relay MQTT (2 broker in parallelo)
        this.closeAllMqtt();
        const hTopic = hostTopic(code);
        const sTopic = syncTopic(code);
        MQTT_BROKERS.forEach((brokerUrl) => {
            try {
                const client = mqtt.connect(brokerUrl, { clean: true, connectTimeout: 5000, reconnectPeriod: 2000 });
                client.on('connect', () => {
                    client.subscribe(hTopic);
                    handlers.onStatus?.(`Cloud Online Attivo • Stanza: ${code}`);
                });
                client.on('message', (topic, messageBuffer) => {
                    if (topic !== hTopic) return;
                    try {
                        const data = JSON.parse(messageBuffer.toString());
                        dispatch(data, (reply) => this.publish(sTopic, reply));
                    } catch (e) {}
                });
                this.mqttClients.push(client);
            } catch (e) {}
        });

        // C. PeerJS WebRTC
        try {
            if (this.peer) this.peer.destroy();
            const peer = new Peer(PEER_ID_PREFIX + code, PEER_ICE_CONFIG);
            this.peer = peer;
            peer.on('open', () => handlers.onStatus?.(`Online (Cloud + P2P) • Stanza: ${code}`));
            peer.on('connection', (conn) => {
                this.connections = [...this.connections.filter(c => c !== conn), conn];
                conn.on('data', (data) => {
                    if (data && data.type === 'JOIN_REQUEST') conn.playerId = data.playerId;
                    dispatch(data, (reply) => { try { conn.send(reply); } catch (e) {} });
                });
            });
        } catch (e) {}
    }

    broadcastState(code, state) {
        const msg = { type: 'SYNC_STATE', state };
        this.publish(syncTopic(code), msg);
        if (this.bc) { try { this.bc.postMessage(msg); } catch (e) {} }
        this.connections.forEach(conn => {
            if (conn && conn.open) { try { conn.send(msg); } catch (e) {} }
        });
    }

    kickPlayer(code, targetId) {
        const msg = { type: 'KICKED', targetId };
        this.publish(syncTopic(code), msg);
        if (this.bc) { try { this.bc.postMessage(msg); } catch (e) {} }
        this.connections.forEach(conn => {
            if (conn && conn.open) {
                try {
                    conn.send(msg);
                    if (conn.playerId === targetId) setTimeout(() => conn.close(), 200);
                } catch (e) {}
            }
        });
        this.connections = this.connections.filter(c => c.playerId !== targetId);
    }

    // ------------------------------------------------------------ CLIENT
    /**
     * callbacks: { onMessage(data), onStatus(text), onTimeout() }
     * Invia la richiesta di ingresso su tutti i canali, con retry ogni 1,1 s.
     */
    joinRoom(code, playerName, playerId, callbacks, { maxAttempts = 10, intervalMs = 1100 } = {}) {
        this.stopJoin();
        this.closeAllMqtt();
        this.closeBroadcastChannel();

        const hTopic = hostTopic(code);
        const sTopic = syncTopic(code);
        const joinMsg = { type: 'JOIN_REQUEST', playerId, playerName };

        // 1. MQTT
        MQTT_BROKERS.forEach((brokerUrl) => {
            try {
                const client = mqtt.connect(brokerUrl, { clean: true, connectTimeout: 5000, reconnectPeriod: 2000 });
                client.on('connect', () => {
                    client.subscribe(sTopic, () => client.publish(hTopic, JSON.stringify(joinMsg)));
                });
                client.on('message', (topic, messageBuffer) => {
                    if (topic !== sTopic) return;
                    try { callbacks.onMessage(JSON.parse(messageBuffer.toString())); } catch (e) {}
                });
                this.mqttClients.push(client);
            } catch (e) {}
        });

        // 2. BroadcastChannel
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_PREFIX + code);
        bc.onmessage = (ev) => callbacks.onMessage(ev.data);
        this.bc = bc;
        try { bc.postMessage(joinMsg); } catch (e) {}

        // 3. PeerJS + retry
        let attempts = 0;
        const sendAll = () => {
            attempts += 1;
            this.publish(hTopic, joinMsg);
            try { bc.postMessage(joinMsg); } catch (e) {}

            try {
                if (!this.peer || this.peer.destroyed) this.peer = new Peer(undefined, PEER_ICE_CONFIG);
                const peer = this.peer;
                const tryPeerConn = () => {
                    if (!this.joinTimer) return; // join già concluso
                    if (this.hostConn && this.hostConn.open) {
                        this.hostConn.send(joinMsg);
                        return;
                    }
                    const conn = peer.connect(PEER_ID_PREFIX + code, { reliable: true });
                    this.hostConn = conn;
                    conn.on('open', () => conn.send(joinMsg));
                    conn.on('data', (data) => callbacks.onMessage(data));
                };
                if (peer.open) tryPeerConn();
                else peer.once('open', tryPeerConn);
            } catch (e) {}
        };

        // joinTimer deve esistere prima del primo sendAll (usato da tryPeerConn)
        this.joinTimer = setInterval(() => {
            if (attempts >= maxAttempts) {
                this.stopJoin();
                callbacks.onTimeout?.();
                return;
            }
            callbacks.onStatus?.(`Ricerca stanza ${code} (${attempts + 1}/${maxAttempts})...`);
            sendAll();
        }, intervalMs);
        sendAll();
    }

    sendActionToHost(code, action) {
        const msg = { type: 'PLAYER_ACTION', action };
        this.publish(hostTopic(code), msg);
        if (this.hostConn && this.hostConn.open) { try { this.hostConn.send(msg); } catch (e) {} }
        if (this.bc) { try { this.bc.postMessage(msg); } catch (e) {} }
    }

    pingHost(code, playerId) {
        this.publish(hostTopic(code), { type: 'PING_STATE', playerId });
        if (this.bc) { try { this.bc.postMessage({ type: 'PING_STATE' }); } catch (e) {} }
        if (this.hostConn && this.hostConn.open) { try { this.hostConn.send({ type: 'PING_STATE' }); } catch (e) {} }
    }
}
