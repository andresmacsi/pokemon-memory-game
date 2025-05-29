class NetworkManager {
    constructor(game) {
        this.game = game;
        this.peer = null;
        this.connection = null;
        this.isHost = false;
        this.roomId = null;
    }

    async initializeHost() {
        // Crear un nuevo peer
        const peerId = 'pokemon-memory-' + Math.random().toString(36).substr(2, 9);
        this.peer = new Peer(peerId);
        this.isHost = true;
        
        await new Promise(resolve => this.peer.on('open', resolve));
        this.roomId = this.peer.id;
        
        // Esperar conexión del otro jugador
        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.setupConnection();
        });

        return this.roomId;
    }

    async joinGame(hostId) {
        this.peer = new Peer();
        this.isHost = false;
        
        await new Promise(resolve => this.peer.on('open', resolve));
        this.connection = this.peer.connect(hostId);
        this.setupConnection();
    }

    setupConnection() {
        this.connection.on('open', () => {
            // Actualizar UI cuando se establece la conexión
            document.getElementById('connectionStatus').textContent = 'Conectado';
            document.getElementById('connectionStatus').classList.add('connected');
            
            if (!this.isHost) {
                // El invitado espera a que el host inicie el juego
                this.game.disableStart();
            }
        });

        this.connection.on('data', (data) => {
            switch(data.type) {
                case 'INIT_GAME':
                    this.game.cards = data.cards;
                    this.game.renderCards();
                    break;
                case 'CARD_FLIP':
                    this.game.handleRemoteCardFlip(data.index);
                    break;
                case 'TURN_CHANGE':
                    this.game.handleRemoteTurnChange(data.currentPlayer);
                    break;
            }
        });
    }

    sendGameState(cards) {
        if (this.connection) {
            this.connection.send({
                type: 'INIT_GAME',
                cards: cards
            });
        }
    }

    sendCardFlip(index) {
        if (this.connection) {
            this.connection.send({
                type: 'CARD_FLIP',
                index: index
            });
        }
    }

    sendTurnChange(currentPlayer) {
        if (this.connection) {
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
