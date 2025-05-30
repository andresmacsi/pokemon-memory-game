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
            // Validar y limpiar el ID
            const cleanId = hostId.trim().replace(/[^a-zA-Z0-9]/g, '');
            console.log('ID limpio:', cleanId);
            
            if (cleanId.length !== 9) {
                throw new Error(`Código de sala inválido: debe tener exactamente 9 caracteres (tiene ${cleanId.length})`);
            }
            
            // Formatear el ID completo
            const formattedHostId = `pokemon-memory-${cleanId}`;
            console.log('Intentando conectar a:', formattedHostId);
            
            // Crear el peer
            this.peer = new Peer();
            this.isHost = false;
            
            // Esperamos a que el peer se inicialice o falle
            await new Promise((resolve, reject) => {
                // Evento de conexión exitosa
                this.peer.on('open', (id) => {
                    console.log('Peer creado con ID:', id);
                    resolve();
                });
                
                // Manejo de errores
                this.peer.on('error', (err) => {
                    console.error('Error de conexión:', err);
                    let errorMsg = 'Error de conexión';
                    
                    if (err.type === 'peer-unavailable') {
                        errorMsg = 'Sala no encontrada o código inválido. Verifica el código e intenta nuevamente.';
                    } else if (err.type === 'network') {
                        errorMsg = 'Problema de red. Verifica tu conexión a internet.';
                    } else if (err.type === 'server-error') {
                        errorMsg = 'Error en el servidor. Intenta más tarde.';
                    }
                    
                    reject(new Error(errorMsg));
                });
                
                // Timeout por si tarda demasiado
                setTimeout(() => {
                    reject(new Error('Tiempo de conexión agotado. Verifica tu conexión a internet.'));
                }, 15000); // 15 segundos de timeout
            });
            
            // Intentar conectar al host
            console.log('Peer iniciado, intentando conectar a la sala...');
            this.connection = this.peer.connect(formattedHostId, {
                reliable: true
            });
            
            if (!this.connection) {
                throw new Error('No se pudo establecer la conexión con la sala');
            }
            
            // Configurar los manejadores de eventos para la conexión
            this.setupConnection();
            
            console.log('Solicitud de conexión enviada, esperando aceptación...');
            
        } catch (error) {
            console.error('Error al unirse al juego:', error);
            throw error;
        }
    }
    
    setupConnection() {
        if (!this.connection) return;
        
        // Añadir un timeout de seguridad para la conexión
        const connectionTimeout = setTimeout(() => {
            if (!this.isConnected) {
                console.error('Timeout de conexión - No se recibió respuesta del servidor');
                if (this.game && !this.isHost) {
                    // Reactivar controles en caso de timeout
                    this.game.createRoomButton.disabled = false;
                    this.game.joinRoomButton.disabled = false;
                    this.game.roomInput.disabled = false;
                    this.game.roomInput.focus();
                }
            }
        }, 10000); // 10 segundos
        
        this.connection.on('open', () => {
            // Limpiar el timeout ya que la conexión se estableció
            clearTimeout(connectionTimeout);
            
            this.isConnected = true;
            const status = document.getElementById('connectionStatus');
            
            // Remover clases previas
            status.classList.remove('connecting', 'error');
            status.classList.add('connected');
            
            if (this.isHost) {
                status.textContent = '¡Jugador 2 conectado! - Puedes iniciar el juego';
                // Habilitar el botón de inicio para el anfitrión
                if (this.game && this.game.startButton) {
                    this.game.startButton.disabled = false;
                }
            } else {
                status.textContent = '¡Conectado! - Esperando que el anfitrión inicie el juego';
                // Ahora sí deshabilitamos el input ya que la conexión fue exitosa
                if (this.game && this.game.roomInput) {
                    this.game.roomInput.disabled = true;
                }
                // Deshabilitar el botón de inicio para el jugador que se une
                if (typeof this.game.disableStart === 'function') {
                    this.game.disableStart();
                }
            }
            
            console.log('Conexión establecida correctamente');
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
                        this.game.handleRemoteTurnChange(data.currentPlayer);                        break;
                }
            } catch (error) {
                console.error('Error al procesar datos:', error);
            }
        });
        
        this.connection.on('close', () => {
            this.isConnected = false;
            const status = document.getElementById('connectionStatus');
            
            // Actualizar estado visual
            status.textContent = 'Desconectado - El otro jugador salió';
            status.classList.remove('connected', 'connecting');
            status.classList.add('error');
            
            // Mostrar alerta
            alert('La conexión con el otro jugador se ha cerrado. El juego terminará y volverás al modo de un jugador.');
            
            // Volver al modo de un solo jugador
            console.log('Volviendo al modo de un jugador debido a desconexión');
            this.game.handleGameModeChange({ target: { value: 'singlePlayer' }});
            
            // Restaurar estado normal después de un tiempo
            setTimeout(() => {
                status.classList.remove('error');
                status.textContent = 'No conectado';
            }, 5000);
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
