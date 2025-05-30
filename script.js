// Array de los primeros 151 Pokémon de Kanto
const KANTO_POKEMON = Array.from({length: 151}, (_, i) => ({
    id: i + 1,
    name: `pokemon-${i + 1}`,
    image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i + 1}.png`
}));

class MemoryGame {
    constructor() {
        // Inicialización de propiedades
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.isLocked = false;
        this.gameMode = 'singlePlayer';
        this.currentPlayer = 1;
        this.scores = {
            player1: 0,
            player2: 0
        };
        this.cpuMemory = new Map();
        this.cpuThinkingTime = { min: 1000, max: 2000 };
        this.networkManager = null;
        this.playerNumber = null;
        this.isGameStarted = false;        this.cardPairsCount = 6; // Valor por defecto: 6 pares (12 cartas)

        // Referencias DOM
        this.initDOMReferences();

        // Verificación de elementos DOM
        if (!this.verifyDOMElements()) {
            console.error('No se encontraron todos los elementos necesarios del DOM');
            return;
        }

        // Event Listeners
        this.setupEventListeners();
    }    initDOMReferences() {
        this.gameBoard = document.getElementById('gameBoard');
        this.startButton = document.getElementById('startGame');
        this.gameModeSelect = document.getElementById('gameMode');
        this.cardCountSelect = document.getElementById('cardCount');
        this.player2Label = document.getElementById('player2Label');
        this.score1Element = document.getElementById('score1');
        this.score2Element = document.getElementById('score2');
        this.currentPlayerText = document.getElementById('currentPlayerText');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.onlineOptions = document.getElementById('onlineOptions');
        this.createRoomButton = document.getElementById('createRoom');
        this.joinRoomButton = document.getElementById('joinRoom');
        this.roomInput = document.getElementById('roomInput');
        this.roomInfo = document.getElementById('roomInfo');
        this.roomCode = document.getElementById('roomCode');
        this.copyCodeButton = document.getElementById('copyCode');
    }    verifyDOMElements() {
        return Boolean(
            this.gameBoard && 
            this.startButton && 
            this.gameModeSelect &&
            this.cardCountSelect &&
            this.player2Label && 
            this.score1Element && 
            this.score2Element &&
            this.currentPlayerText && 
            this.onlineOptions
        );
    }

    setupEventListeners() {
        // Event listener para iniciar juego
        this.startButton.addEventListener('click', () => {
            console.log('Iniciando juego...');
            this.initializeGame();
        });

        // Event listener para cambio de modo
        this.gameModeSelect.addEventListener('change', (e) => {
            console.log('Cambiando modo de juego...');
            this.handleGameModeChange(e);
        });

        // Event listeners para modo online
        this.createRoomButton.addEventListener('click', () => this.createRoom());
        this.joinRoomButton.addEventListener('click', () => this.joinRoom());
        this.setupOnlineEventListeners();
    }

    setupOnlineEventListeners() {
        // Mejorar el manejo del pegado y copiado del código        
        this.copyCodeButton.addEventListener('click', () => {
            const fullCode = this.roomCode.textContent;
            const simpleCode = fullCode.replace('pokemon-memory-', '');
            navigator.clipboard.writeText(simpleCode).then(() => {
                // Cambiar texto del botón para indicar éxito
                this.copyCodeButton.textContent = '¡Copiado!';
                
                // Mostrar una notificación más discreta en vez de un alert
                const notification = document.createElement('div');
                notification.className = 'copy-notification';
                notification.textContent = 'Código copiado al portapapeles';
                document.body.appendChild(notification);
                
                // Quitar la notificación después de un tiempo
                setTimeout(() => {
                    document.body.removeChild(notification);
                    this.copyCodeButton.textContent = 'Copiar código simple';
                }, 2000);
            }).catch(err => {
                console.error('Error al copiar el código:', err);
                alert('Error al copiar el código. Por favor, cópialo manualmente.');
            });
        });
        
        // Manejo mejorado del pegado de texto
        this.roomInput.addEventListener('paste', (e) => {
            e.preventDefault(); // Prevenir el pegado por defecto
            const pastedText = e.clipboardData.getData('text').trim();
            
            // Limpiar el código pegado de cualquier formato especial
            let cleanCode = pastedText
                .replace('pokemon-memory-', '')
                .replace(/[^a-zA-Z0-9]/g, '');
            
            // Si el código es muy largo, tomamos solo los primeros 9 caracteres
            if (cleanCode.length > 9) {
                cleanCode = cleanCode.substring(0, 9);
            }
            
            if (cleanCode.length === 9) {
                this.roomInput.value = cleanCode;
                this.roomInput.classList.remove('error');
                this.joinRoomButton.disabled = false;
            } else {
                this.roomInput.value = cleanCode; // Mostramos lo que se pudo limpiar
                this.roomInput.classList.add('error');
                this.joinRoomButton.disabled = true;
                
                if (cleanCode.length === 0) {
                    alert('El código pegado está vacío o contiene caracteres no válidos.');
                } else if (cleanCode.length < 9) {
                    alert(`Código de sala incompleto (${cleanCode.length}/9 caracteres). Por favor, verifica el código.`);
                }
            }
        });
        
        // Validación en tiempo real del input
        this.roomInput.addEventListener('input', (e) => {
            let value = e.target.value.trim();
            
            // Eliminar cualquier carácter que no sea alfanumérico
            const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '');
            
            // Si se eliminaron caracteres, actualizar el valor del input
            if (cleanValue !== value) {
                this.roomInput.value = cleanValue;
                value = cleanValue;
            }
            
            // Limitar a 9 caracteres
            if (value.length > 9) {
                this.roomInput.value = value.substring(0, 9);
                value = this.roomInput.value;
            }
            
            // Validar la longitud para habilitar/deshabilitar el botón
            if (value.length === 9) {
                this.roomInput.classList.remove('error');
                this.joinRoomButton.disabled = false;
                console.log('Código válido:', value);
            } else {
                this.roomInput.classList.remove('error'); // No mostrar error mientras escriben
                this.joinRoomButton.disabled = true;
            }
        });
        
        // Manejar la tecla Enter para unirse a una sala
        this.roomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.joinRoomButton.disabled) {
                e.preventDefault();
                this.joinRoom();
            }
        });
    }

    handleGameModeChange(e) {
        const newMode = e.target.value;
        console.log('Cambiando modo de juego a:', newMode);
        
        // Detener el juego actual si existe
        if (this.isGameStarted) {
            this.resetGame();
            this.isGameStarted = false;
        }

        // Limpiar conexiones de red si existían
        if (this.networkManager) {
            this.networkManager.disconnect();
            this.networkManager = null;
        }
        
        // Configurar nuevo modo
        this.gameMode = newMode;
        console.log('Modo de juego establecido:', this.gameMode);
        
        // Actualizar UI según el modo
        this.updateUIForGameMode();
        
        // Resetear el tablero
        this.gameBoard.innerHTML = '';
        this.updateTurnIndicator();
    }

    updateUIForGameMode() {
        // Actualizar etiqueta del jugador 2
        this.player2Label.textContent = this.gameMode === 'singlePlayer' ? 'CPU' : 'Jugador 2';
        
        // Mostrar/ocultar opciones online
        this.onlineOptions.style.display = this.gameMode === 'online' ? 'block' : 'none';
        
        // Configurar botón de inicio
        if (this.gameMode === 'online') {
            this.startButton.disabled = true;
            this.enableOnlineOptions();
        } else {
            this.startButton.disabled = false;
            this.disableOnlineOptions();
        }
        
        console.log('UI actualizada para modo:', this.gameMode);
    }
    
    enableOnlineOptions() {
        if (this.createRoomButton) {
            this.createRoomButton.disabled = false;
        }
        if (this.joinRoomButton) {
            this.joinRoomButton.disabled = true; // Se habilitará cuando el input tenga 9 caracteres
        }
        if (this.roomInput) {
            this.roomInput.disabled = false;
            this.roomInput.value = '';
            this.roomInput.focus(); // Dar foco al input para facilitar la entrada
            this.roomInput.placeholder = "Ingresa el código de sala";
            console.log('Campo de entrada habilitado');
        }
        
        // Ocultar info de sala si estaba visible de una sesión anterior
        if (this.roomInfo) {
            this.roomInfo.style.display = 'none';
        }
        
        // Resetear estado de conexión
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = 'No conectado';
            statusElement.classList.remove('connected', 'connecting', 'error');
        }
    }

    disableOnlineOptions() {
        if (this.createRoomButton) {
            this.createRoomButton.disabled = true;
        }
        if (this.joinRoomButton) {
            this.joinRoomButton.disabled = true;
        }
        if (this.roomInput) {
            this.roomInput.disabled = true;
        }
        if (this.roomInfo) {
            this.roomInfo.style.display = 'none';
        }
    }
      initializeGame() {
        console.log('Iniciando juego en modo:', this.gameMode);
        
        // Validar el modo online
        if (this.gameMode === 'online' && !this.networkManager?.connection) {
            alert('Debes crear una sala o unirte a una primero');
            return;
        }

        // Reiniciar el estado del juego
        this.resetGame();
        
        try {
            // Obtener la cantidad de pares de cartas seleccionada
            const cardPairsCount = parseInt(this.cardCountSelect.value) || 6;
            console.log('Iniciando juego con', cardPairsCount, 'pares de cartas');
            
            // Generar y mostrar las cartas
            const selectedPokemon = this.getRandomPokemon(cardPairsCount);
            this.cards = this.shuffleCards([...selectedPokemon, ...selectedPokemon].map(pokemon => ({
                pokemon,
                isFlipped: false,
                isMatched: false
            })));
            
            // En modo online, el host envía el estado inicial
            if (this.gameMode === 'online' && this.networkManager.isHost) {
                this.networkManager.sendGameState({
                    cards: this.cards,
                    currentPlayer: this.currentPlayer
                });
            }
            
            this.renderCards();
            this.updateTurnIndicator();
            this.isGameStarted = true;
            
            console.log('Juego inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar el juego:', error);
            alert('Hubo un error al iniciar el juego. Por favor, intenta nuevamente.');
        }
    }

    resetGame() {
        this.gameBoard.innerHTML = '';
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.isLocked = false;
        this.currentPlayer = 1;
        this.scores = { player1: 0, player2: 0 };
        this.updateScores();
        this.cpuMemory.clear();
        this.updateTurnIndicator();
    }    getRandomPokemon(count) {
        // Asegurarse de que count sea un número válido
        count = Math.min(Math.max(count, 1), 151);
        
        // Mezclar el array de Pokémon
        const shuffled = [...KANTO_POKEMON].sort(() => Math.random() - 0.5);
        
        // Devolver los primeros 'count' Pokémon
        return shuffled.slice(0, count);
    }

    shuffleCards(cards) {
        return [...cards].sort(() => Math.random() - 0.5);
    }

    renderCards() {
        this.gameBoard.innerHTML = '';
        
        // Ajustar el diseño del tablero según la cantidad de cartas
        const totalCards = this.cards.length;
        
        // Aplicar clase CSS según la cantidad de cartas
        if (totalCards <= 12) {
            this.gameBoard.className = 'game-board small-deck';
        } else if (totalCards <= 24) {
            this.gameBoard.className = 'game-board medium-deck';
        } else {
            this.gameBoard.className = 'game-board large-deck';
        }
        
        this.cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.index = index;
            
            // Ajustar tamaño de las cartas según la cantidad
            if (totalCards > 12) {
                const cardSize = totalCards <= 24 ? '90px' : '80px';
                const fontSize = totalCards <= 24 ? '0.9em' : '0.8em';
                cardElement.style.width = cardSize;
                cardElement.style.height = cardSize;
                cardElement.style.fontSize = fontSize;
            }
            
            const cardInner = document.createElement('div');
            cardInner.className = 'card-inner';
            
            const cardFront = document.createElement('div');
            cardFront.className = 'card-front';
            
            const cardBack = document.createElement('div');
            cardBack.className = 'card-back';
            
            const img = document.createElement('img');
            img.src = card.pokemon.image;
            img.alt = card.pokemon.name;
            img.loading = 'lazy';
            
            cardBack.appendChild(img);
            cardInner.appendChild(cardFront);
            cardInner.appendChild(cardBack);
            cardElement.appendChild(cardInner);
            
            cardElement.addEventListener('click', () => this.handleCardClick(index));
            
            this.gameBoard.appendChild(cardElement);
        });
    }

    handleCardClick(index) {
        // Ignorar clicks si el juego está bloqueado o si no es el turno del jugador
        if (this.isLocked || 
            (this.gameMode === 'online' && this.playerNumber !== this.currentPlayer) ||
            (this.gameMode === 'singlePlayer' && this.currentPlayer === 2)) {
            console.log('Click ignorado: juego bloqueado o no es tu turno');
            return;
        }
        
        const card = this.cards[index];
        
        // Ignorar si la carta ya está volteada o emparejada
        if (card.isFlipped || card.isMatched) {
            console.log('Carta ya volteada o emparejada');
            return;
        }
        
        // Voltear la carta
        this.flipCard(card, index);
        
        // En modo online, enviar evento de carta volteada
        if (this.gameMode === 'online' && this.networkManager && this.networkManager.isConnected()) {
            this.networkManager.sendCardFlip(index);
        }
        
        // Comprobar si hay un par
        if (this.flippedCards.length === 2) {
            this.isLocked = true;
            this.checkMatch();
        }
    }

    flipCard(card, index) {
        // Actualizar estado de la carta
        card.isFlipped = true;
        this.flippedCards.push({ card, index });
        
        // Actualizar UI
        const cardElement = this.gameBoard.children[index];
        cardElement.querySelector('.card-inner').classList.add('flipped');
        
        // Si estamos jugando contra la CPU, añadir esta carta a su memoria
        if (this.gameMode === 'singlePlayer') {
            // La CPU recuerda la carta
            this.cpuMemory.set(card.pokemon.id, index);
            console.log('CPU recordó carta:', card.pokemon.id, 'en posición', index);
        }
    }

    checkMatch() {
        const [first, second] = this.flippedCards;
        
        // Comprobar si las cartas coinciden (mismo Pokémon)
        if (first.card.pokemon.id === second.card.pokemon.id) {
            console.log('¡Par encontrado!');
            
            // Manejar el emparejamiento correcto
            this.handleMatch(first.index, second.index).then(() => {
                // Actualizar puntuación
                this.scores[this.currentPlayer === 1 ? 'player1' : 'player2']++;
                this.updateScores();
                
                // Verificar si el juego ha terminado
                this.matchedPairs++;
                if (this.matchedPairs === this.cards.length / 2) {
                    this.endGame();
                    return;
                }
                
                // En modo singlePlayer, si es turno de la CPU, hacer su movimiento
                if (this.gameMode === 'singlePlayer' && this.currentPlayer === 2) {
                    setTimeout(() => {
                        this.playCPUTurn();
                    }, 1000);
                }
            });
        } else {
            console.log('No hay coincidencia');
            
            // Manejar la falta de coincidencia
            this.handleMismatch().then(() => {
                // Cambiar turno
                this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                this.updateTurnIndicator();
                
                // En modo online, enviar el cambio de turno
                if (this.gameMode === 'online' && this.networkManager && this.networkManager.isConnected()) {
                    this.networkManager.sendTurnChange(this.currentPlayer);
                }
                
                // En modo singlePlayer, si es turno de la CPU, hacer su movimiento
                if (this.gameMode === 'singlePlayer' && this.currentPlayer === 2) {
                    setTimeout(() => {
                        this.playCPUTurn();
                    }, 1000);
                }
            });
        }
    }    async handleMatch(index1, index2) {
        return new Promise(resolve => {
            setTimeout(() => {
                // Marcar las cartas como emparejadas
                this.cards[index1].isMatched = true;
                this.cards[index2].isMatched = true;
                
                // Actualizar UI
                const card1Element = this.gameBoard.children[index1];
                const card2Element = this.gameBoard.children[index2];
                card1Element.classList.add('matched');
                card2Element.classList.add('matched');
                
                // Mostrar mensaje de coincidencia
                this.showStatusMessage('¡Par encontrado!', 'status-pair-found');
                
                // Reiniciar estado
                this.flippedCards = [];
                this.isLocked = false;
                
                resolve();
            }, 1000); // Mostrar las cartas emparejadas durante un segundo
        });
    }
    
    // Método para mostrar mensajes de estado temporales
    showStatusMessage(message, className = '') {
        // Crear elemento para el mensaje
        const statusElement = document.createElement('div');
        statusElement.className = 'status-message ' + className;
        statusElement.textContent = message;
        
        // Añadir al DOM
        document.body.appendChild(statusElement);
        
        // Eliminar después de la animación
        setTimeout(() => {
            document.body.removeChild(statusElement);
        }, 1500);
    }

    async handleMismatch() {
        return new Promise(resolve => {
            setTimeout(() => {
                // Voltear las cartas de nuevo
                const [first, second] = this.flippedCards;
                
                this.cards[first.index].isFlipped = false;
                this.cards[second.index].isFlipped = false;
                
                // Actualizar UI
                const card1Element = this.gameBoard.children[first.index];
                const card2Element = this.gameBoard.children[second.index];
                card1Element.querySelector('.card-inner').classList.remove('flipped');
                card2Element.querySelector('.card-inner').classList.remove('flipped');
                
                // Reiniciar estado
                this.flippedCards = [];
                this.isLocked = false;
                
                resolve();
            }, 1500); // Mostrar las cartas no emparejadas durante 1.5 segundos
        });
    }    updateScores() {
        // Actualizar el texto de las puntuaciones
        this.score1Element.textContent = this.scores.player1;
        this.score2Element.textContent = this.scores.player2;
        
        // Añadir animación de cambio de puntuación
        const currentPlayerScoreElement = this.currentPlayer === 1 ? 
            this.score1Element : this.score2Element;
        
        // Aplicar animación
        currentPlayerScoreElement.classList.remove('score-change');
        void currentPlayerScoreElement.offsetWidth; // Truco para reiniciar la animación
        currentPlayerScoreElement.classList.add('score-change');
    }updateTurnIndicator() {
        const playerText = this.currentPlayer === 1 ? 'Jugador 1' : 
                          (this.gameMode === 'singlePlayer' ? 'CPU' : 'Jugador 2');
        this.currentPlayerText.textContent = playerText;
        
        // Actualizar clases CSS para efectos visuales
        const turnIndicator = document.getElementById('turnIndicator');
        if (turnIndicator) {
            // Limpiar clases previas
            turnIndicator.classList.remove('player1-turn', 'player2-turn');
            
            // Añadir clase según el jugador actual
            turnIndicator.classList.add(this.currentPlayer === 1 ? 'player1-turn' : 'player2-turn');
            
            // Añadir efecto de animación
            turnIndicator.classList.remove('turn-change');
            void turnIndicator.offsetWidth; // Truco para reiniciar la animación
            turnIndicator.classList.add('turn-change');
        }
        
        // Actualizar clases de los marcadores
        const player1Score = document.querySelector('.player1');
        const player2Score = document.querySelector('.player2');
        
        if (player1Score && player2Score) {
            player1Score.classList.toggle('active', this.currentPlayer === 1);
            player2Score.classList.toggle('active', this.currentPlayer === 2);
        }
    }

    async playCPUTurn() {
        console.log('Turno de la CPU...');
        this.isLocked = true;
        
        // Pensar durante un tiempo aleatorio para simular que la CPU está "pensando"
        const thinkingTime = Math.floor(
            Math.random() * (this.cpuThinkingTime.max - this.cpuThinkingTime.min) + 
            this.cpuThinkingTime.min
        );
        
        await new Promise(resolve => setTimeout(resolve, thinkingTime));
        
        // Lógica de la CPU para elegir cartas
        const availableCards = this.cards
            .map((card, index) => ({ card, index }))
            .filter(item => !item.card.isFlipped && !item.card.isMatched);
        
        if (availableCards.length < 2) {
            console.error('No hay suficientes cartas disponibles');
            this.isLocked = false;
            return;
        }
        
        // Intentar encontrar un par que la CPU recuerde
        const knownPairs = new Map();
        
        // Construir pares conocidos
        this.cpuMemory.forEach((index, pokemonId) => {
            const card = this.cards[index];
            if (!card.isMatched && !card.isFlipped) {
                if (!knownPairs.has(pokemonId)) {
                    knownPairs.set(pokemonId, [index]);
                } else {
                    knownPairs.get(pokemonId).push(index);
                }
            }
        });
        
        // Buscar pares completos (dos cartas del mismo Pokémon)
        let foundPair = null;
        knownPairs.forEach((indices, pokemonId) => {
            if (indices.length >= 2 && !foundPair) {
                foundPair = [indices[0], indices[1]];
            }
        });
        
        if (foundPair) {
            console.log('CPU encontró un par conocido');
            await this.makeCPUMove(foundPair[0], foundPair[1]);
        } else {
            // Si no hay pares conocidos, seleccionar una carta al azar y luego intentar encontrar su pareja
            const randomIndex = Math.floor(Math.random() * availableCards.length);
            const firstCard = availableCards[randomIndex];
            
            // Buscar la pareja en la memoria
            const pokemonId = firstCard.card.pokemon.id;
            const knownMatch = this.cpuMemory.has(pokemonId) ? 
                              this.cpuMemory.get(pokemonId) : null;
            
            // Solo usar la carta conocida si no es la misma que acabamos de seleccionar
            let secondCardIndex;
            if (knownMatch !== null && knownMatch !== firstCard.index && 
                !this.cards[knownMatch].isMatched && !this.cards[knownMatch].isFlipped) {
                console.log('CPU recordó la pareja de la primera carta');
                secondCardIndex = knownMatch;
            } else {
                // Seleccionar otra carta al azar (que no sea la primera)
                const remainingCards = availableCards.filter(item => item.index !== firstCard.index);
                const randomIndex2 = Math.floor(Math.random() * remainingCards.length);
                secondCardIndex = remainingCards[randomIndex2].index;
            }
            
            await this.makeCPUMove(firstCard.index, secondCardIndex);
        }
    }

    async makeCPUMove(index1, index2) {
        // Voltear primera carta
        this.flipCard(this.cards[index1], index1);
        
        // Esperar un momento antes de voltear la segunda
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Voltear segunda carta
        this.flipCard(this.cards[index2], index2);
        
        // Comprobar si hay un par
        this.checkMatch();
    }

    endGame() {
        const winner = this.scores.player1 > this.scores.player2 ? 
            'Jugador 1' : 
            this.scores.player1 < this.scores.player2 ? 
                (this.gameMode === 'singlePlayer' ? 'CPU' : 'Jugador 2') : 
                'Empate';
        
        setTimeout(() => {
            alert(`¡Juego terminado! ${winner === 'Empate' ? 'Es un empate!' : `¡${winner} gana!`}`);
        }, 500);
    }
    
    async createRoom() {
        // Desactivar controles durante la creación de la sala
        this.createRoomButton.disabled = true;
        
        // Actualizar estado
        const statusElement = document.getElementById('connectionStatus');
        statusElement.textContent = 'Creando sala...';
        statusElement.classList.add('connecting');
        
        try {
            if (!this.networkManager) {
                throw new Error('NetworkManager no inicializado');
            }
            
            // Crear sala
            const roomId = await this.networkManager.createGame();
            console.log('Sala creada con ID:', roomId);
            
            // Mostrar código de sala
            const simpleCode = roomId.replace('pokemon-memory-', '');
            this.roomCode.textContent = roomId;
            
            // Mostrar información de la sala
            this.roomInfo.style.display = 'block';
            
            // Actualizar estado
            statusElement.textContent = 'Sala creada. Esperando a otro jugador...';
            statusElement.classList.remove('connecting');
            statusElement.classList.add('ready');
            
            // Deshabilitar opciones de unirse
            this.joinRoomButton.disabled = true;
            this.roomInput.disabled = true;
            
            // Establecer número de jugador
            this.playerNumber = 1;
            
            // Habilitar botón de inicio de juego
            this.startButton.disabled = false;
            this.startButton.textContent = 'Iniciar Juego';
            
        } catch (error) {
            console.error('Error al crear sala:', error);
            statusElement.textContent = 'Error al crear sala: ' + error.message;
            statusElement.classList.remove('connecting');
            statusElement.classList.add('error');
            
            // Re-habilitar botón
            this.createRoomButton.disabled = false;
        }
    }
    
    async joinRoom() {
        const roomId = this.roomInput.value.trim();
        
        if (roomId.length !== 9) {
            alert('El código de sala debe tener 9 caracteres');
            return;
        }
        
        // Desactivar controles durante la unión a la sala
        this.joinRoomButton.disabled = true;
        
        // Actualizar estado
        const statusElement = document.getElementById('connectionStatus');
        statusElement.textContent = 'Conectando a sala...';
        statusElement.classList.add('connecting');
        
        try {
            if (!this.networkManager) {
                throw new Error('NetworkManager no inicializado');
            }
            
            // Formatear el ID de la sala
            const fullRoomId = 'pokemon-memory-' + roomId;
            
            // Unirse a la sala
            await this.networkManager.joinGame(fullRoomId);
            console.log('Unido a sala:', fullRoomId);
            
            // Actualizar estado
            statusElement.textContent = 'Conectado a la sala';
            statusElement.classList.remove('connecting');
            statusElement.classList.add('connected');
            
            // Deshabilitar opciones de creación
            this.createRoomButton.disabled = true;
            
            // Establecer número de jugador
            this.playerNumber = 2;
            
            // Deshabilitar botón de inicio (el anfitrión inicia)
            this.startButton.disabled = true;
            this.startButton.textContent = 'Esperando al anfitrión...';
            
        } catch (error) {
            console.error('Error al unirse a sala:', error);
            statusElement.textContent = 'Error al unirse: ' + error.message;
            statusElement.classList.remove('connecting');
            statusElement.classList.add('error');
            
            // Re-habilitar controles
            this.joinRoomButton.disabled = false;
            this.roomInput.disabled = false;
        }
    }
    
    // Este método no se usa actualmente ya que manejamos el copiado a través del event listener
    // Lo mantenemos por si se necesita en el futuro, pero evitamos cualquier conflicto
    copyRoomCode() {
        if (this.roomCode.textContent) {
            const fullCode = this.roomCode.textContent;
            const simpleCode = fullCode.replace('pokemon-memory-', '');
            
            navigator.clipboard.writeText(simpleCode)
                .then(() => {
                    console.log('Código copiado mediante copyRoomCode()');
                })
                .catch(err => {
                    console.error('Error al copiar:', err);
                });
        }
    }
    
    handleRemoteCardFlip(index) {
        const card = this.cards[index];
        
        // Solo procesar si la carta no está ya volteada o emparejada
        if (!card.isFlipped && !card.isMatched) {
            this.flipCard(card, index);
            
            // Comprobar si hay un par
            if (this.flippedCards.length === 2) {
                this.isLocked = true;
                this.checkMatch();
            }
        }
    }
    
    handleRemoteTurnChange(newCurrentPlayer) {
        this.currentPlayer = newCurrentPlayer;
        this.isLocked = false;
        this.updateTurnIndicator();
    }
}

// Instanciar el juego cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    // Asegurarse de que todos los elementos existan antes de inicializar
    if (document.getElementById('gameBoard') && 
        document.getElementById('startGame') && 
        document.getElementById('gameMode')) {
        console.log('Inicializando el juego...');
        window.game = new MemoryGame();
    } else {
        console.error('No se encontraron todos los elementos necesarios');
    }
});
