// Array de los primeros 151 Pokémon de Kanto
const KANTO_POKEMON = Array.from({length: 151}, (_, i) => ({
    id: i + 1,
    name: `pokemon-${i + 1}`,
    image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i + 1}.png`
}));

class MemoryGame {    constructor() {
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
        this.playerNumber = null; // 1 para host, 2 para invitado
        
        // Referencias DOM
        this.gameBoard = document.getElementById('gameBoard');
        this.startButton = document.getElementById('startGame');
        this.gameModeSelect = document.getElementById('gameMode');
        this.player2Label = document.getElementById('player2Label');
        this.score1Element = document.getElementById('score1');
        this.score2Element = document.getElementById('score2');
        this.currentPlayerText = document.getElementById('currentPlayerText');

        // Nuevas referencias DOM para el modo online
        this.createRoomButton = document.getElementById('createRoom');
        this.joinRoomButton = document.getElementById('joinRoom');
        this.roomInput = document.getElementById('roomInput');
        this.roomInfo = document.getElementById('roomInfo');
        this.roomCode = document.getElementById('roomCode');
        this.copyCodeButton = document.getElementById('copyCode');
        this.onlineOptions = document.getElementById('onlineOptions');

        // Event Listeners
        this.startButton.addEventListener('click', () => this.initializeGame());
        this.gameModeSelect.addEventListener('change', (e) => this.handleGameModeChange(e));
        this.createRoomButton.addEventListener('click', () => this.createRoom());
        this.joinRoomButton.addEventListener('click', () => this.joinRoom());
        this.copyCodeButton.addEventListener('click', () => this.copyRoomCode());
    }

    handleGameModeChange(e) {
        const newMode = e.target.value;
        
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
        
        // Limpiar el tablero
        this.resetGame();
    }

    resetUIForNewMode() {
        // Resetear UI del modo online
        this.createRoomButton.disabled = false;
        this.joinRoomButton.disabled = false;
        this.roomInput.disabled = false;
        this.roomInput.value = '';
        this.roomInfo.style.display = 'none';
        this.connectionStatus.textContent = 'No conectado';
        this.connectionStatus.classList.remove('connected');
        
        // Habilitar controles principales
        this.enableStart();
        this.startButton.textContent = 'Iniciar Juego';
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
    }

    initializeGame() {
        if (this.gameMode === 'online' && !this.networkManager?.connection) {
            alert('Debes crear una sala o unirte a una primero');
            return;
        }

        this.resetGame();

        // Asignar número de jugador en modo online
        if (this.gameMode === 'online') {
            this.playerNumber = this.networkManager.isHost ? 1 : 2;
        }

        // Solo el host genera y envía las cartas
        if (this.gameMode !== 'online' || this.networkManager.isHost) {
            const selectedPokemon = this.getRandomPokemon(12); // 12 parejas = 24 cartas
            this.cards = this.shuffleCards([...selectedPokemon, ...selectedPokemon]);
            
            if (this.gameMode === 'online') {
                // El host envía el estado inicial
                this.networkManager.sendGameState({
                    cards: this.cards,
                    currentPlayer: this.currentPlayer
                });
            }
            this.renderCards();
        }

        this.updateTurnIndicator();
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
            card.setAttribute('data-index', index);
            card.innerHTML = `
                <div class="card-inner">
                    <div class="card-front"></div>
                    <div class="card-back">
                        <img src="${pokemon.image}" alt="${pokemon.name}" loading="eager" 
                             data-pokemon-id="${pokemon.id}" />
                    </div>
                </div>
            `;
            card.addEventListener('click', () => this.flipCard(card, index));
            this.gameBoard.appendChild(card);
        });
    }

    handleCardClick(index) {
        const card = this.gameBoard.children[index];
        
        if (this.isLocked || 
            this.flippedCards.includes(index) || 
            card.classList.contains('matched') ||
            (this.gameMode === 'singlePlayer' && this.currentPlayer === 2)) {
            return;
        }

        this.flipCard(card, index);
        this.flippedCards.push(index);

        if (this.flippedCards.length === 2) {
            this.isLocked = true;
            this.checkMatch();
        }

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

        if (this.gameMode === 'online') {
            this.networkManager.sendCardFlip(index);
        }
    }

    flipCard(card, index) {
        // Verificar si es mi turno y si puedo voltear la carta
        if (
            this.isLocked || 
            this.flippedCards.length >= 2 || 
            card.classList.contains('flipped') ||
            (this.gameMode === 'online' && !this.isMyTurn())
        ) {
            return;
        }

        card.classList.add('flipped');
        this.flippedCards.push({ card, index });

        // Notificar al otro jugador
        if (this.gameMode === 'online') {
            this.networkManager.sendCardFlip(index);
        }

        if (this.flippedCards.length === 2) {
            this.isLocked = true;
            this.checkMatch();
        }
    }

    isMyTurn() {
        if (this.gameMode !== 'online') return true;
        return this.currentPlayer === this.playerNumber;
    }

    checkMatch() {
        const [firstCard, secondCard] = this.flippedCards;
        const match = this.cards[firstCard.index].id === this.cards[secondCard.index].id;

        if (match) {
            this.handleMatch();
        } else {
            this.handleMismatch();
        }

        // Cambiar turno en modo multijugador
        if (this.gameMode !== 'singlePlayer') {
            setTimeout(() => {
                this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                if (this.gameMode === 'online') {
                    this.networkManager.sendTurnChange(this.currentPlayer);
                }
                this.updateTurnIndicator();
                this.isLocked = false;
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
    }    async handleMismatch(index1, index2) {
        // Mostrar mensaje de no coincidencia
        const nextPlayerName = this.currentPlayer === 1 ? 
            (this.gameMode === 'singlePlayer' ? 'CPU' : 'Jugador 2') : 
            'Jugador 1';
        const message = document.createElement('div');
        message.className = 'mismatch-message';
        message.textContent = `No hay coincidencia. Turno de ${nextPlayerName}`;
        document.body.appendChild(message);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        message.remove();

        const card1 = this.gameBoard.children[index1];
        const card2 = this.gameBoard.children[index2];
        
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');
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
        // Primera carta
        const card1 = this.gameBoard.children[index1];
        this.flipCard(card1, index1);
        this.flippedCards.push(index1);
        
        // Esperar antes de voltear la segunda carta
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Segunda carta
        const card2 = this.gameBoard.children[index2];
        this.flipCard(card2, index2);
        this.flippedCards.push(index2);
        
        // Procesar el resultado
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
