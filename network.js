class NetworkManager {
    constructor(game) {
        this.game = game;
        this.peer = null;
        this.connection = null;
        this.isHost = false;
        this.roomId = null;
        this.isConnected = false;
    }

    async initializeHost() {
        try {
            const peerId = 'pokemon-memory-' + Math.random().toString(36).substr(2, 9);
            this.peer = new Peer(peerId);
            this.isHost = true;
            
            await new Promise((resolve, reject) => {
                this.peer.on('open', resolve);
                this.peer.on('error', reject);
            });
            
            this.roomId = this.peer.id;
            
            this.peer.on('connection', (conn) => {
                this.connection = conn;
                this.setupConnection();
            });

            return this.roomId;
        } catch (error) {
            console.error('Error al inicializar host:', error);
            throw error;
        }
    }

    async joinGame(hostId) {
        try {
            this.peer = new Peer();
            this.isHost = false;
            
            await new Promise((resolve, reject) => {
                this.peer.on('open', resolve);
                this.peer.on('error', reject);
            });
            
            this.connection = this.peer.connect(hostId);
            this.setupConnection();
        } catch (error) {
            console.error('Error al unirse al juego:', error);
            throw error;
        }
    }

    setupConnection() {
        if (!this.connection) return;

        this.connection.on('open', () => {
            this.isConnected = true;
            const status = document.getElementById('connectionStatus');
            
            if (this.isHost) {
                status.textContent = 'Jugador 2 conectado - Puedes iniciar el juego';
            } else {
                status.textContent = 'Conectado - Esperando que el anfitrión inicie el juego';
                if (typeof this.game.disableStart === 'function') {
                    this.game.disableStart();
                }
            }
            status.classList.add('connected');
        });

        this.connection.on('data', (data) => {
            if (!this.game) return;

            try {
                switch(data.type) {
                    case 'INIT_GAME':
                        if (data.cards && Array.isArray(data.cards)) {
                            this.game.cards = data.cards;
                            this.game.currentPlayer = data.currentPlayer;
                            this.game.renderCards();
                            this.game.updateTurnIndicator();
                        }
                        break;
                    case 'CARD_FLIP':
                        if (!this.isHost && this.game.currentPlayer === 1 ||
                            this.isHost && this.game.currentPlayer === 2) {
                            this.game.handleRemoteCardFlip(data.index);
                        }
                        break;
                    case 'TURN_CHANGE':
                        this.game.handleRemoteTurnChange(data.currentPlayer);
                        break;
                }
            } catch (error) {
                console.error('Error al procesar datos:', error);
            }
        });

        this.connection.on('close', () => {
            this.isConnected = false;
            const status = document.getElementById('connectionStatus');
            status.textContent = 'Desconectado';
            status.classList.remove('connected');
            alert('La conexión se ha cerrado. El juego terminará.');
            this.game.handleGameModeChange({ target: { value: 'singlePlayer' }});
        });
    }

    sendGameState(gameState) {
        if (this.connection) {
            console.log('Enviando estado del juego:', gameState);
            this.connection.send({
                type: 'INIT_GAME',
                ...gameState
            });
        }
    }

    sendCardFlip(index) {
        if (this.connection) {
            console.log('Enviando volteo de carta:', index);
            this.connection.send({
                type: 'CARD_FLIP',
                index: index
            });
        }
    }

    sendTurnChange(currentPlayer) {
        if (this.connection) {
            console.log('Enviando cambio de turno:', currentPlayer);
            this.connection.send({
                type: 'TURN_CHANGE',
                currentPlayer: currentPlayer
            });
        }
    }

    disconnect() {
        if (this.connection) {
            this.connection.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
    }
}
