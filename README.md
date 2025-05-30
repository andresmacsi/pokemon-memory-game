# Juego de Memoria Pokémon

Un juego de memoria clásico con los Pokémon de la primera generación (Kanto). El juego permite jugar solo contra la CPU, en modo de 2 jugadores local o en línea.

¡Juega ahora! https://andresmacsi.github.io/pokemon-memory-game/

## Características

- 151 Pokémon de la región Kanto disponibles
- Modo de 1 jugador contra CPU con diferentes niveles de dificultad
- Modo de 2 jugadores local
- Modo multijugador en línea
- Interfaz intuitiva y responsiva
- Sistema de puntuación
- Animaciones suaves de volteo de cartas
- IA avanzada para el modo contra CPU
- Diferentes tamaños de tablero (12, 24 o 36 cartas)

## Cómo jugar

1. Abre el archivo `index.html` en tu navegador web
2. Selecciona el modo de juego (1 jugador vs CPU, 2 jugadores local o en línea)
3. Si eliges el modo contra CPU, selecciona el nivel de dificultad
4. Selecciona el tamaño del tablero (12, 24 o 36 cartas)
5. Haz clic en "Iniciar Juego"
6. Encuentra pares de Pokémon iguales volteando las cartas
7. El jugador con más pares al final del juego gana

## Estructura del proyecto

- `index.html` - Estructura HTML principal
- `pokemon-memory.css` - Estilos consolidados del juego
- `script.js` - Lógica principal del juego
- `game-enhancements.js` - Mejoras como IA avanzada y temporizador
- `network.js` - Funcionalidad para juego multijugador en línea

## Requisitos

- Navegador web moderno con soporte para JavaScript
- Conexión a internet (para cargar las imágenes de los Pokémon y juego en línea)

## Optimizaciones recientes

- Consolidación de estilos CSS en un único archivo para mejorar el rendimiento
- Implementación de IA mejorada con diferentes niveles de dificultad
- Modo multijugador en línea utilizando PeerJS
- Interfaz responsiva para diferentes dispositivos

## Créditos

- Imágenes de Pokémon proporcionadas por [PokeAPI](https://pokeapi.co/)
- Funcionalidad de red implementada con [PeerJS](https://peerjs.com/)
- Desarrollado como proyecto de práctica

## Nota

Este juego es un proyecto educativo y no tiene fines comerciales. Pokémon y todos sus personajes son propiedad de Nintendo/Game Freak.
