// Extensión de la IA para el juego de memoria Pokémon
class AdvancedCPU {
    constructor(game) {
        this.game = game;
        this.memory = new Map(); // Mapa para recordar las cartas vistas (id -> posición)
        
        // Configuración de dificultad
        this.memoryRetentionRate = 0.7; // Probabilidad de recordar una carta (0-1)
        this.smartMoveRate = 0.8;       // Probabilidad de hacer un movimiento inteligente vs. aleatorio
        this.thinkingTime = { min: 800, max: 1500 }; // Tiempo de "pensamiento" en ms
        
        // Estadísticas
        this.pairsFound = 0;
        this.totalMoves = 0;
        this.smartMoves = 0;
    }
    
    // Establecer nivel de dificultad
    setDifficulty(level) {
        switch(level) {
            case 'easy':
                this.memoryRetentionRate = 0.3;
                this.smartMoveRate = 0.4;
                this.thinkingTime = { min: 1000, max: 2000 };
                break;
            case 'medium':
                this.memoryRetentionRate = 0.6;
                this.smartMoveRate = 0.7;
                this.thinkingTime = { min: 800, max: 1500 };
                break;
            case 'hard':
                this.memoryRetentionRate = 0.85;
                this.smartMoveRate = 0.9;
                this.thinkingTime = { min: 600, max: 1200 };
                break;
            case 'impossible':
                this.memoryRetentionRate = 1;
                this.smartMoveRate = 1;
                this.thinkingTime = { min: 500, max: 1000 };
                break;
        }
        console.log(`CPU dificultad establecida en: ${level}`);
    }
    
    // Simular que la CPU observa una carta
    observeCard(pokemonId, position) {
        // Decidir si recordar esta carta basado en la retención de memoria
        if (Math.random() < this.memoryRetentionRate) {
            // Guardar o actualizar la posición en la memoria
            if (!this.memory.has(pokemonId)) {
                this.memory.set(pokemonId, []);
            }
            
            // Añadir la posición si no está ya en la memoria
            const positions = this.memory.get(pokemonId);
            if (!positions.includes(position)) {
                positions.push(position);
                console.log(`CPU recordó: Pokémon ${pokemonId} en posición ${position}`);
            }
        }
    }
    
    // Olvidar una carta (usada cuando una carta ha sido emparejada)
    forgetCard(pokemonId) {
        if (this.memory.has(pokemonId)) {
            this.memory.delete(pokemonId);
            console.log(`CPU olvidó: Pokémon ${pokemonId} (ya emparejado)`);
        }
    }
    
    // Hacer un movimiento
    async makeMove() {
        this.totalMoves++;
        console.log('CPU pensando su movimiento...');
        
        // Simular tiempo de pensamiento
        const thinkingTime = Math.floor(
            Math.random() * (this.thinkingTime.max - this.thinkingTime.min) + 
            this.thinkingTime.min
        );
        
        await new Promise(resolve => setTimeout(resolve, thinkingTime));
        
        // Decidir si hacer un movimiento inteligente o aleatorio
        if (Math.random() < this.smartMoveRate) {
            return this.makeSmartMove();
        } else {
            return this.makeRandomMove();
        }
    }
    
    // Hacer un movimiento inteligente basado en la memoria
    async makeSmartMove() {
        console.log('CPU intentando hacer un movimiento inteligente...');
        this.smartMoves++;
        
        // Obtener cartas disponibles (no volteadas ni emparejadas)
        const availableCards = this.game.cards
            .map((card, index) => ({ card, index }))
            .filter(item => !item.card.isFlipped && !item.card.isMatched);
        
        // 1. Buscar pares conocidos en memoria
        const knownPairs = [];
        
        this.memory.forEach((positions, pokemonId) => {
            // Si conocemos al menos 2 posiciones para este Pokémon
            if (positions.length >= 2) {
                // Verificar que las cartas siguen disponibles
                const availablePositions = positions.filter(pos => {
                    const card = this.game.cards[pos];
                    return card && !card.isFlipped && !card.isMatched;
                });
                
                if (availablePositions.length >= 2) {
                    knownPairs.push({
                        pokemonId,
                        positions: availablePositions
                    });
                }
            }
        });
        
        // Si conocemos algún par, seleccionarlo
        if (knownPairs.length > 0) {
            const selectedPair = knownPairs[Math.floor(Math.random() * knownPairs.length)];
            console.log(`CPU encontró un par conocido para Pokémon ${selectedPair.pokemonId}`);
            
            // Usar las dos primeras posiciones conocidas
            const [pos1, pos2] = [selectedPair.positions[0], selectedPair.positions[1]];
            return { first: pos1, second: pos2, type: 'known-pair' };
        }
        
        // 2. Si no conocemos pares completos, intentar encontrar coincidencias
        // para una carta que seleccionemos al azar
        
        // Seleccionar una carta aleatoria
        const randomIndex = Math.floor(Math.random() * availableCards.length);
        const firstCard = availableCards[randomIndex];
        const pokemonId = firstCard.card.pokemon.id;
        
        // Buscar si conocemos otra carta del mismo Pokémon
        if (this.memory.has(pokemonId)) {
            const knownPositions = this.memory.get(pokemonId);
            
            // Filtrar posiciones conocidas que no sean la carta seleccionada y estén disponibles
            const validPositions = knownPositions.filter(pos => {
                return pos !== firstCard.index && 
                       !this.game.cards[pos].isFlipped && 
                       !this.game.cards[pos].isMatched;
            });
            
            if (validPositions.length > 0) {
                // Seleccionar una de las posiciones conocidas
                const secondPos = validPositions[Math.floor(Math.random() * validPositions.length)];
                console.log(`CPU recordó la pareja para la carta en posición ${firstCard.index}`);
                
                return { first: firstCard.index, second: secondPos, type: 'partial-known' };
            }
        }
        
        // 3. Si no pudimos hacer un movimiento inteligente, hacer uno semi-aleatorio
        // (primera carta aleatoria, segunda evitando las que ya conocemos que no coinciden)
        
        // Seleccionar una carta aleatoria para la primera elección
        const availableForSecond = availableCards.filter(item => item.index !== firstCard.index);
        
        // Si no hay más cartas disponibles, devolver un movimiento aleatorio
        if (availableForSecond.length === 0) {
            return this.makeRandomMove();
        }
        
        // Intentar evitar cartas que sabemos que no coinciden
        const secondCardIndex = Math.floor(Math.random() * availableForSecond.length);
        const secondCard = availableForSecond[secondCardIndex];
        
        console.log(`CPU hizo un movimiento semi-aleatorio`);
        return { first: firstCard.index, second: secondCard.index, type: 'semi-random' };
    }
    
    // Hacer un movimiento aleatorio
    makeRandomMove() {
        console.log('CPU haciendo un movimiento aleatorio...');
        
        // Obtener cartas disponibles
        const availableCards = this.game.cards
            .map((card, index) => ({ card, index }))
            .filter(item => !item.card.isFlipped && !item.card.isMatched);
        
        if (availableCards.length < 2) {
            console.error('No hay suficientes cartas disponibles');
            return null;
        }
        
        // Seleccionar dos cartas aleatorias diferentes
        const firstIndex = Math.floor(Math.random() * availableCards.length);
        const first = availableCards[firstIndex].index;
        
        // Eliminar la primera carta seleccionada
        availableCards.splice(firstIndex, 1);
        
        const secondIndex = Math.floor(Math.random() * availableCards.length);
        const second = availableCards[secondIndex].index;
        
        return { first, second, type: 'random' };
    }
    
    // Obtener estadísticas de rendimiento
    getStats() {
        return {
            pairsFound: this.pairsFound,
            totalMoves: this.totalMoves,
            smartMoves: this.smartMoves,
            smartMovePercentage: this.totalMoves > 0 ? 
                Math.round((this.smartMoves / this.totalMoves) * 100) : 0
        };
    }
    
    // Registrar un par encontrado
    registerPairFound() {
        this.pairsFound++;
    }
    
    // Resetear estadísticas para un nuevo juego
    reset() {
        this.memory.clear();
        this.pairsFound = 0;
        this.totalMoves = 0;
        this.smartMoves = 0;
    }
}

// Clase para manejar el tiempo de juego
class GameTimer {
    constructor(updateCallback) {
        this.startTime = 0;
        this.elapsedTime = 0;
        this.isRunning = false;
        this.timerInterval = null;
        this.timeLimit = 0; // 0 significa sin límite
        this.updateCallback = updateCallback || function() {};
    }
    
    // Iniciar el temporizador
    start() {
        if (!this.isRunning) {
            this.startTime = Date.now() - this.elapsedTime;
            this.isRunning = true;
            
            this.timerInterval = setInterval(() => {
                this.elapsedTime = Date.now() - this.startTime;
                this.updateCallback(this.formatTime(this.elapsedTime), this.getRemainingTime());
            }, 1000);
            
            console.log('Temporizador iniciado');
        }
    }
    
    // Detener el temporizador
    stop() {
        if (this.isRunning) {
            clearInterval(this.timerInterval);
            this.isRunning = false;
            console.log('Temporizador detenido');
        }
    }
    
    // Reiniciar el temporizador
    reset() {
        this.elapsedTime = 0;
        
        if (this.isRunning) {
            this.stop();
            this.start();
        }
        
        console.log('Temporizador reiniciado');
    }
    
    // Establecer un límite de tiempo (en segundos, 0 = sin límite)
    setTimeLimit(seconds) {
        this.timeLimit = seconds * 1000; // Convertir a milisegundos
        console.log(`Límite de tiempo establecido: ${seconds} segundos`);
    }
    
    // Obtener tiempo restante (en milisegundos)
    getRemainingTime() {
        if (this.timeLimit <= 0) {
            return -1; // Sin límite
        }
        
        const remaining = this.timeLimit - this.elapsedTime;
        return Math.max(0, remaining);
    }
    
    // Comprobar si se ha agotado el tiempo
    isTimeUp() {
        if (this.timeLimit <= 0) {
            return false; // Sin límite
        }
        
        return this.elapsedTime >= this.timeLimit;
    }
    
    // Formatear tiempo en formato mm:ss
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Obtener tiempo transcurrido en segundos
    getElapsedSeconds() {
        return Math.floor(this.elapsedTime / 1000);
    }
}

// Funciones para crear efectos visuales

// Crear confeti para la pantalla de victoria
function createConfetti() {
    const container = document.querySelector('.victory-screen');
    if (!container) return;
    
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#fff'];
    const shapes = ['square', 'circle'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Posición aleatoria horizontal
        const posX = Math.random() * 100;
        
        // Color aleatorio
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Forma aleatoria
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        
        // Tamaño aleatorio
        const size = Math.random() * 10 + 5;
        
        // Velocidad aleatoria
        const speed = Math.random() * 5 + 3;
        
        // Rotación aleatoria
        const rotation = Math.random() * 360;
        
        // Aplicar estilos
        confetti.style.left = `${posX}%`;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        confetti.style.backgroundColor = color;
        confetti.style.borderRadius = shape === 'circle' ? '50%' : '0';
        confetti.style.animationDuration = `${speed}s`;
        confetti.style.transform = `rotate(${rotation}deg)`;
        confetti.style.opacity = Math.random() * 0.7 + 0.3;
        
        // Añadir al contenedor
        container.appendChild(confetti);
    }
}

// Crear la pantalla de victoria
function createVictoryScreen(winner, scores, timeElapsed, onPlayAgain, onMainMenu) {
    // Crear elementos
    const victoryScreen = document.createElement('div');
    victoryScreen.className = 'victory-screen';
    
    const content = document.createElement('div');
    content.className = 'victory-content';
    
    // Título según ganador
    const title = document.createElement('h1');
    title.className = 'victory-title';
    
    if (winner === 'Empate') {
        title.textContent = '¡Empate!';
    } else {
        title.textContent = `¡${winner} gana!`;
    }
    
    // Detalles del juego
    const details = document.createElement('div');
    details.className = 'victory-details';
    
    const scoreText = document.createElement('p');
    scoreText.innerHTML = `
        <span class="player1-name">Jugador 1:</span> 
        <span class="victory-score">${scores.player1}</span> - 
        <span class="player2-name">${winner === 'CPU' ? 'CPU' : 'Jugador 2'}:</span> 
        <span class="victory-score">${scores.player2}</span>
    `;
    
    const timeText = document.createElement('p');
    timeText.textContent = `Tiempo total: ${timeElapsed}`;
    
    details.appendChild(scoreText);
    details.appendChild(timeText);
    
    // Botones
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'victory-buttons';
    
    const playAgainButton = document.createElement('button');
    playAgainButton.className = 'victory-button play-again';
    playAgainButton.textContent = 'Jugar de nuevo';
    playAgainButton.addEventListener('click', () => {
        document.body.removeChild(victoryScreen);
        if (typeof onPlayAgain === 'function') onPlayAgain();
    });
    
    const menuButton = document.createElement('button');
    menuButton.className = 'victory-button menu-button';
    menuButton.textContent = 'Menú principal';
    menuButton.addEventListener('click', () => {
        document.body.removeChild(victoryScreen);
        if (typeof onMainMenu === 'function') onMainMenu();
    });
    
    buttonsContainer.appendChild(playAgainButton);
    buttonsContainer.appendChild(menuButton);
    
    // Ensamblar todo
    content.appendChild(title);
    content.appendChild(details);
    content.appendChild(buttonsContainer);
    victoryScreen.appendChild(content);
    
    // Añadir al cuerpo del documento
    document.body.appendChild(victoryScreen);
    
    // Añadir efectos de confeti
    createConfetti();
    
    return victoryScreen;
}

// Elementos de la interfaz
function createGameTimer() {
    const timerContainer = document.createElement('div');
    timerContainer.className = 'game-timer';
    
    const timerIcon = document.createElement('span');
    timerIcon.className = 'timer-icon';
    timerIcon.innerHTML = '⏱️';
    
    const timerText = document.createElement('span');
    timerText.className = 'timer-text';
    timerText.textContent = '00:00';
    
    timerContainer.appendChild(timerIcon);
    timerContainer.appendChild(timerText);
    
    // Oculto inicialmente
    timerContainer.style.display = 'none';
    
    document.body.appendChild(timerContainer);
    return timerContainer;
}

// Exportar las clases y funciones
window.PokemonMemoryExtensions = {
    AdvancedCPU,
    GameTimer,
    createVictoryScreen,
    createGameTimer
};
