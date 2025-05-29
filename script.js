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
        this.gameModeSelect.addEventListener('change', (e) => {
            this.gameMode = e.target.value;
            this.player2Label.textContent = this.gameMode === 'singlePlayer' ? 'CPU' : 'Jugador 2';
            this.onlineOptions.style.display = this.gameMode === 'online' ? 'block' : 'none';
        });
        this.createRoomButton.addEventListener('click', () => this.createRoom());
        this.joinRoomButton.addEventListener('click', () => this.joinRoom());
        this.copyCodeButton.addEventListener('click', () => this.copyRoomCode());
    }    initializeGame() {
        this.resetGame();
        const selectedPokemon = this.getRandomPokemon(12); // 12 parejas = 24 cartas
        this.cards = this.shuffleCards([...selectedPokemon, ...selectedPokemon]);
        
        if (this.gameMode === 'online' && this.networkManager.isHost) {
            this.networkManager.sendGameState(this.cards);
        }
        
        this.renderCards();
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
        this.cards.forEach((pokemon, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-front"></div>
                <div class="card-back">
                    <img src="${pokemon.image}" alt="${pokemon.name}">
                </div>
            `;
            card.dataset.index = index;
            card.addEventListener('click', () => this.handleCardClick(index));
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
        card.classList.add('flipped');
    }    async checkMatch() {
        const [index1, index2] = this.flippedCards;
        const match = this.cards[index1].id === this.cards[index2].id;

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (match) {
            // Si hay coincidencia, el jugador mantiene su turno
            await this.handleMatch(index1, index2);
            this.flippedCards = [];
            this.isLocked = false;
            
            // Si es CPU y encontró una pareja, debe seguir jugando
            if (this.gameMode === 'singlePlayer' && this.currentPlayer === 2) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.playCPUTurn();
            }
        } else {
            // Si no hay coincidencia, cambia el turno
            await this.handleMismatch(index1, index2);
            this.flippedCards = [];
            this.isLocked = false;
            
            // Cambiar turno solo cuando no hay coincidencia
            const wasPlayer1 = this.currentPlayer === 1;
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            this.updateTurnIndicator();

            // Si es modo un jugador y cambiamos al turno de la CPU
            if (this.gameMode === 'singlePlayer' && wasPlayer1) {
                // Pequeña pausa antes de que la CPU juegue
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.playCPUTurn();
            }
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
        const currentPlayerName = this.currentPlayer === 1 ? 'Jugador 1' : 
            (this.gameMode === 'singlePlayer' ? 'CPU' : 'Jugador 2');
        this.currentPlayerText.textContent = currentPlayerName;
        
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
            // Verificar que NetworkManager esté disponible
            if (typeof NetworkManager === 'undefined') {
                throw new Error('El componente de red no está disponible');
            }

            // Inicializar el NetworkManager si no existe
            if (!this.networkManager) {
                this.networkManager = new NetworkManager(this);
            }
            
            const roomId = await this.networkManager.initializeHost();
            if (!roomId) {
                throw new Error('No se pudo obtener un ID de sala');
            }

            this.roomCode.textContent = roomId;
            this.roomInfo.style.display = 'block';
        } catch (error) {
            console.error('Error al crear la sala:', error);
            alert('Error al crear la sala: ' + error.message);
        }
    }

    async joinRoom() {
        try {
            const roomId = this.roomInput.value.trim();
            if (!roomId) {
                alert('Por favor, ingresa un código de sala válido.');
                return;
            }

            // Inicializar el NetworkManager si no existe
            if (!this.networkManager) {
                this.networkManager = new NetworkManager(this);
            }

            await this.networkManager.joinGame(roomId);
        } catch (error) {
            console.error('Error al unirse a la sala:', error);
            alert('Error al unirse a la sala. Verifica el código e intenta de nuevo.');
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
        if (this.gameMode === 'online') {
            const card = this.gameBoard.children[index];
            this.flipCard(card, index);
            this.flippedCards.push(index);

            if (this.flippedCards.length === 2) {
                this.isLocked = true;
                this.checkMatch();
            }
        }
    }

    handleRemoteTurnChange(newCurrentPlayer) {
        if (this.gameMode === 'online') {
            this.currentPlayer = newCurrentPlayer;
            this.updateTurnIndicator();
        }
    }
}

// Inicializar el juego
document.addEventListener('DOMContentLoaded', () => {
    new MemoryGame();
});
