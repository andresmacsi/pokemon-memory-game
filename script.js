// Array de los primeros 151 Pokémon de Kanto
const KANTO_POKEMON = Array.from({length: 151}, (_, i) => ({
    id: i + 1,
    name: `pokemon-${i + 1}`,
    image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i + 1}.png`
}));

class MemoryGame {
    constructor() {
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

        // Referencias DOM
        this.gameBoard = document.getElementById('gameBoard');
        this.startButton = document.getElementById('startGame');
        this.gameModeSelect = document.getElementById('gameMode');
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

        // Event Listeners
        this.startButton.addEventListener('click', () => this.initializeGame());
        this.gameModeSelect.addEventListener('change', (e) => this.handleGameModeChange(e));
        this.createRoomButton.addEventListener('click', () => this.createRoom());
        this.joinRoomButton.addEventListener('click', () => this.joinRoom());
        this.copyCodeButton.addEventListener('click', () => this.copyRoomCode());        // Manejar el pegado de texto
        this.roomInput.addEventListener('paste', (e) => {
            // No prevenir el comportamiento por defecto para permitir el pegado normal
            const pastedText = e.clipboardData.getData('text').trim();
            
            // Validar después de que el texto se haya pegado
            setTimeout(() => {
                const currentValue = this.roomInput.value.trim();
                if (!/^[a-zA-Z0-9]+$/.test(currentValue)) {
                    this.roomInput.classList.add('error');
                    this.roomInput.value = ''; // Limpiar el input si no es válido
                    setTimeout(() => this.roomInput.classList.remove('error'), 2000);
                    alert('El código de sala debe contener solo letras y números');
                } else {
                    this.roomInput.classList.remove('error');
                }
            }, 0);
        });
    }    handleGameModeChange(e) {
        const newMode = e.target.value;
        console.log('Cambiando modo de juego a:', newMode);

        // Reiniciar el juego completamente
        this.resetGame();
        
        // Limpiar estado anterior
        if (this.networkManager) {
            this.networkManager.disconnect();
            this.networkManager = null;
        }
        
        // Limpiar estado anterior
        if (this.networkManager) {
            this.networkManager.disconnect();
            this.networkManager = null;
        }
        
        // Resetear UI
        this.resetUIForNewMode();
        
        // Configurar nuevo modo
        this.gameMode = newMode;
        this.player2Label.textContent = this.gameMode === 'singlePlayer' ? 'CPU' : 'Jugador 2';
        this.onlineOptions.style.display = this.gameMode === 'online' ? 'block' : 'none';
        
        // Reiniciar el juego con el nuevo modo
        this.resetGame();
        
        // Habilitar o deshabilitar opciones según el modo
        if (this.gameMode === 'online') {
            this.startButton.disabled = true;
            this.createRoomButton.disabled = false;
            this.joinRoomButton.disabled = false;
            this.roomInput.disabled = false;
        } else {
            this.startButton.disabled = false;
            if (this.onlineOptions) {
                this.createRoomButton.disabled = true;
                this.joinRoomButton.disabled = true;
                this.roomInput.disabled = true;
            }
        }
    }

    resetUIForNewMode() {
        if (this.createRoomButton) this.createRoomButton.disabled = false;
        if (this.joinRoomButton) this.joinRoomButton.disabled = false;
        if (this.roomInput) {
            this.roomInput.disabled = false;
            this.roomInput.value = '';
        }
        if (this.roomInfo) this.roomInfo.style.display = 'none';
        if (this.connectionStatus) {
            this.connectionStatus.textContent = 'No conectado';
            this.connectionStatus.classList.remove('connected');
        }
        
        this.enableStart();
    }

    disableStart() {
        this.startButton.disabled = true;
        this.startButton.textContent = 'Esperando al anfitrión...';
        this.gameModeSelect.disabled = true;
    }

    enableStart() {
        this.startButton.disabled = false;
        this.startButton.textContent = 'Iniciar Juego';
        this.gameModeSelect.disabled = false;
    }    initializeGame() {
        console.log('Iniciando juego en modo:', this.gameMode);
        console.log('Estado actual:', {
            isLocked: this.isLocked,
            currentPlayer: this.currentPlayer,
            scores: this.scores,
            flippedCards: this.flippedCards,
            gameMode: this.gameMode
        });
        
        if (this.gameMode === 'online' && !this.networkManager?.connection) {
            alert('Debes crear una sala o unirte a una primero');
            return;
        }

        this.resetGame();
        this.isLocked = false;
        this.currentPlayer = 1;
        this.scores = { player1: 0, player2: 0 };

        // Asignar número de jugador en modo online
        if (this.gameMode === 'online') {
            this.playerNumber = this.networkManager.isHost ? 1 : 2;
        }

        // Generar y mostrar las cartas
        const selectedPokemon = this.getRandomPokemon(12); // 12 parejas = 24 cartas
        this.cards = this.shuffleCards([...selectedPokemon, ...selectedPokemon]);
        
        if (this.gameMode === 'online' && this.networkManager.isHost) {
            // El host envía el estado inicial
            this.networkManager.sendGameState({
                cards: this.cards,
                currentPlayer: this.currentPlayer
            });
        }
        
        this.renderCards();
        this.updateTurnIndicator();
        
        // Inicializar estado según el modo de juego
        if (this.gameMode === 'singlePlayer') {
            this.cpuMemory.clear();
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
    }

    getRandomPokemon(count) {
        const shuffled = [...KANTO_POKEMON].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    shuffleCards(cards) {
        return [...cards].sort(() => Math.random() - 0.5);
    }

    renderCards() {
        this.gameBoard.innerHTML = '';
        console.log('Renderizando cartas:', this.cards);
        this.cards.forEach((pokemon, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.setAttribute('data-index', index);            card.innerHTML = `
                <div class="card-inner">
                    <div class="card-front">
                        <span></span>
                    </div>
                    <div class="card-back">
                        <img src="${pokemon.image}" alt="${pokemon.name}" loading="eager" 
                             data-pokemon-id="${pokemon.id}" />
                    </div>
                </div>
            `;
            card.addEventListener('click', () => this.handleCardClick(index));
            this.gameBoard.appendChild(card);
        });
    }    handleCardClick(index) {
        // Verificar si el jugador puede hacer clic
        if (this.isLocked || 
            this.flippedCards.includes(index) || 
            card.classList.contains('matched') ||
            (this.gameMode === 'singlePlayer' && this.currentPlayer === 2) ||
            (this.gameMode === 'online' && this.currentPlayer !== this.playerNumber)) {
            return;
        }

        const card = this.gameBoard.children[index];
        if (card.classList.contains('flipped')) return;

        card.classList.add('flipped');
        this.flippedCards.push(index);

        // Actualizar memoria de CPU
        if (this.gameMode === 'singlePlayer') {
            const pokemon = this.cards[index];
            if (!this.cpuMemory.has(pokemon.id)) {
                this.cpuMemory.set(pokemon.id, []);
            }
            if (!this.cpuMemory.get(pokemon.id).includes(index)) {
                this.cpuMemory.get(pokemon.id).push(index);
            }
        }

        // Enviar el movimiento en modo online
        if (this.gameMode === 'online') {
            this.networkManager.sendCardFlip(index);
        }

        // Verificar si se han volteado dos cartas
        if (this.flippedCards.length === 2) {
            this.isLocked = true;
            setTimeout(() => this.checkMatch(), 1000);
        }
    }    flipCard(card, index) {
        if (card.classList.contains('flipped') || card.classList.contains('matched')) {
            return;
        }

        card.classList.add('flipped');
        this.flippedCards.push(index);

        // Actualizar memoria de CPU en modo un jugador
        if (this.gameMode === 'singlePlayer') {
            const pokemon = this.cards[index];
            if (!this.cpuMemory.has(pokemon.id)) {
                this.cpuMemory.set(pokemon.id, []);
            }
            if (!this.cpuMemory.get(pokemon.id).includes(index)) {
                this.cpuMemory.get(pokemon.id).push(index);
            }
        }

        // Enviar el movimiento en modo online
        if (this.gameMode === 'online') {
            this.networkManager.sendCardFlip(index);
        }

        if (this.flippedCards.length === 2) {
            this.isLocked = true;
            setTimeout(() => this.checkMatch(), 1000);
        }
    }    checkMatch() {
        const [index1, index2] = this.flippedCards;
        const card1 = this.gameBoard.children[index1];
        const card2 = this.gameBoard.children[index2];
        
        const pokemon1 = this.cards[index1];
        const pokemon2 = this.cards[index2];
        
        const match = pokemon1.id === pokemon2.id;

        if (match) {
            // Si hay coincidencia, mantener el turno y actualizar el juego
            this.handleMatch(index1, index2);
            this.flippedCards = [];
            setTimeout(() => {
                this.isLocked = false;
                // Si es la CPU y encuentra un par, debe seguir jugando
                if (this.gameMode === 'singlePlayer' && this.currentPlayer === 2) {
                    setTimeout(() => this.playCPUTurn(), 1000);
                }
            }, 1000);
        } else {
            // Si no hay coincidencia, cambiar el turno
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                this.flippedCards = [];
                this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                this.updateTurnIndicator();
                this.isLocked = false;
                
                if (this.gameMode === 'singlePlayer' && this.currentPlayer === 2) {
                    setTimeout(() => this.playCPUTurn(), 1000);
                }
            }, 1000);
        }
    }    async handleMatch(index1, index2) {
        const card1 = this.gameBoard.children[index1];
        const card2 = this.gameBoard.children[index2];
        
        card1.classList.add('matched');
        card2.classList.add('matched');
        
        this.matchedPairs++;
        this.scores[`player${this.currentPlayer}`]++;
        this.updateScores();

        // Mostrar mensaje de coincidencia
        const playerName = this.currentPlayer === 1 ? 'Jugador 1' : 
            (this.gameMode === 'singlePlayer' ? 'CPU' : 'Jugador 2');
        const message = document.createElement('div');
        message.className = 'match-message';
        message.textContent = `¡${playerName} encontró una pareja! ${playerName} mantiene el turno`;
        document.body.appendChild(message);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        message.remove();

        if (this.matchedPairs === this.cards.length / 2) {
            this.endGame();
        }
    }    async handleMismatch() {
        const [index1, index2] = this.flippedCards;
        const card1 = this.gameBoard.children[index1];
        const card2 = this.gameBoard.children[index2];

        // Esperar un momento antes de voltear las cartas
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Voltear las cartas boca abajo
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');
        
        // Desbloquear el tablero
        this.isLocked = false;
        
        // Cambiar el turno
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateTurnIndicator();

        // Si es el turno de la CPU en modo un jugador, ejecutar su turno
        if (this.gameMode === 'singlePlayer' && this.currentPlayer === 2) {
            setTimeout(() => this.cpuTurn(), 1000);
        }
    }

    updateScores() {
        this.score1Element.textContent = this.scores.player1;
        this.score2Element.textContent = this.scores.player2;
    }

    updateTurnIndicator() {
        const currentPlayerText = document.getElementById('currentPlayerText');
        if (this.gameMode === 'online') {
            currentPlayerText.textContent = this.currentPlayer === this.playerNumber ? 
                'Tu turno' : 'Turno del oponente';
        } else {
            currentPlayerText.textContent = `Jugador ${this.currentPlayer}`;
        }
        
        // Actualizar estados visuales
        const player1Elements = document.querySelectorAll('.player1');
        const player2Elements = document.querySelectorAll('.player2');
        
        player1Elements.forEach(el => {
            el.classList.toggle('player-inactive', this.currentPlayer !== 1);
        });
        player2Elements.forEach(el => {
            el.classList.toggle('player-inactive', this.currentPlayer !== 2);
        });

        // Bloquear/desbloquear el tablero según el turno
        if (this.gameMode === 'singlePlayer' && this.currentPlayer === 2) {
            this.gameBoard.classList.add('player-inactive');
        } else {
            this.gameBoard.classList.remove('player-inactive');
        }
    }    async playCPUTurn() {
        if (this.gameMode !== 'singlePlayer' || this.currentPlayer !== 2 || this.isLocked) return;

        this.isLocked = true; // Bloquear el tablero mientras la CPU piensa
        
        // Simular tiempo de "pensamiento" de la CPU
        const thinkingTime = Math.random() * 
            (this.cpuThinkingTime.max - this.cpuThinkingTime.min) + 
            this.cpuThinkingTime.min;
        await new Promise(resolve => setTimeout(resolve, thinkingTime));

        // Estrategia mejorada de la CPU
        let firstCard, secondCard;

        // 1. Buscar pares conocidos
        for (const [pokemonId, positions] of this.cpuMemory.entries()) {
            const availablePositions = positions.filter(pos => 
                !this.gameBoard.children[pos].classList.contains('matched') &&
                !this.gameBoard.children[pos].classList.contains('flipped')
            );
            if (availablePositions.length >= 2) {
                [firstCard, secondCard] = availablePositions;
                break;
            }
        }

        // 2. Si no hay pares conocidos, intentar completar un par
        if (!firstCard) {
            for (const [pokemonId, positions] of this.cpuMemory.entries()) {
                const unflippedPosition = positions.find(pos => 
                    !this.gameBoard.children[pos].classList.contains('matched') &&
                    !this.gameBoard.children[pos].classList.contains('flipped')
                );
                if (unflippedPosition) {
                    firstCard = unflippedPosition;
                    // Buscar una carta aleatoria para el segundo movimiento
                    const availableCards = Array.from(this.gameBoard.children)
                        .map((_, i) => i)
                        .filter(i => 
                            i !== firstCard &&
                            !this.gameBoard.children[i].classList.contains('matched') &&
                            !this.gameBoard.children[i].classList.contains('flipped')
                        );
                    if (availableCards.length > 0) {
                        secondCard = availableCards[Math.floor(Math.random() * availableCards.length)];
                        break;
                    }
                }
            }
        }

        // 3. Si todo lo demás falla, hacer un movimiento aleatorio
        if (!firstCard || !secondCard) {
            const availableCards = Array.from(this.gameBoard.children)
                .map((_, i) => i)
                .filter(i => 
                    !this.gameBoard.children[i].classList.contains('matched') &&
                    !this.gameBoard.children[i].classList.contains('flipped')
                );
            if (availableCards.length >= 2) {
                [firstCard, secondCard] = this.shuffleCards(availableCards).slice(0, 2);
            }
        }

        if (firstCard !== undefined && secondCard !== undefined) {
            await this.makeCPUMove(firstCard, secondCard);
        }
    }    async makeCPUMove(index1, index2) {
        if (!this.gameBoard.children[index1] || !this.gameBoard.children[index2]) {
            this.isLocked = false;
            return;
        }

        // Primera carta
        const card1 = this.gameBoard.children[index1];
        card1.classList.add('flipped');
        this.flippedCards.push(index1);
        
        // Esperar antes de voltear la segunda carta
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Segunda carta
        const card2 = this.gameBoard.children[index2];
        card2.classList.add('flipped');
        this.flippedCards.push(index2);
        
        // Esperar antes de procesar el resultado
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar coincidencia
        await this.checkMatch();
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
    }    async createRoom() {
        try {
            this.networkManager = new NetworkManager(this);
            const roomId = await this.networkManager.initializeHost();
            
            // Actualizar UI
            this.roomInfo.style.display = 'block';
            this.roomCode.textContent = roomId;
            this.createRoomButton.disabled = true;
            this.joinRoomButton.disabled = true;
            this.roomInput.disabled = true;
            
            // Mostrar estado de espera
            document.getElementById('connectionStatus').textContent = 'Esperando al otro jugador...';
        } catch (error) {
            alert('Error al crear la sala. Por favor, intenta nuevamente.');
            console.error('Error al crear sala:', error);
        }
    }

    async joinRoom() {
        const hostId = this.roomInput.value.trim();
        if (!hostId) {
            alert('Por favor ingresa un código de sala válido');
            return;
        }

        try {
            this.networkManager = new NetworkManager(this);
            await this.networkManager.joinGame(hostId);
            
            // Actualizar UI
            this.createRoomButton.disabled = true;
            this.joinRoomButton.disabled = true;
            this.roomInput.disabled = true;
            this.disableStart();
            
            // Mostrar estado de conexión
            document.getElementById('connectionStatus').textContent = 'Conectando...';
        } catch (error) {
            alert('No se pudo conectar a la sala. Verifica el código e intenta nuevamente.');
            console.error('Error al unirse a la sala:', error);
        }
    }

    copyRoomCode() {
        if (this.roomCode.textContent) {
            navigator.clipboard.writeText(this.roomCode.textContent)
                .then(() => {
                    this.copyCodeButton.textContent = '¡Copiado!';
                    setTimeout(() => {
                        this.copyCodeButton.textContent = 'Copiar';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Error al copiar:', err);
                    alert('Error al copiar el código. Por favor, cópialo manualmente.');
                });
        }
    }

    handleRemoteCardFlip(index) {
        if (!this.isLocked) {
            const card = this.gameBoard.querySelector(`[data-index="${index}"]`);
            if (card && !card.classList.contains('flipped')) {
                // No enviar el flip de vuelta al otro jugador
                card.classList.add('flipped');
                this.flippedCards.push({ card, index });

                if (this.flippedCards.length === 2) {
                    this.isLocked = true;
                    this.checkMatch();
                }
            }
        }
    }

    handleRemoteTurnChange(newCurrentPlayer) {
        this.currentPlayer = newCurrentPlayer;
        this.isLocked = false;
        this.updateTurnIndicator();
    }
}

// Inicializar el juego
document.addEventListener('DOMContentLoaded', () => {
    new MemoryGame();
});
