let gameLoop;
let game;
let snake;

$(function() {
    initGame();
    $(document).keydown(onKeyDown);
    $('#start-button').click(startGame);
});

// BEGIN RENDERING FUNCTIONS

function createGameboard() {
    const gameBoard = $('#game-board');
    for (let i = 0; i < game.size; i++) {
        const row = $('<tr></tr>');
        for (let j = 0; j < game.size; j++) {
            const cell = $('<td></td>');
            cell.attr('id', `${j}-${i}`)
            cell.addClass('cell');

            row.append(cell);
        }

        gameBoard.append(row);
    }
}

function toggleOverlay() {
    $('#button-overlay').toggleClass('hidden');
}

function drawFruit(coords) {
    $('.fruit').removeClass('fruit');
    $(`#${coords.x}-${coords.y}`).addClass('fruit');
}

function drawSnake() {
    $('.snake').removeClass('snake');
    snake.body.forEach(snakeCell => {
        $(`#${snakeCell.x}-${snakeCell.y}`).addClass('snake');
    });
}

function updateScore() {
    $('#score-label').text(`Score: ${game.score}`);
}

// END RENDERING FUNCTIONS

// BEGIN GAME LIFECYCLE FUNCTIONS

function initGame() {
    game = {
        size: 25,
        dead: false,
        score: 0,
        speed: 100
    };

    snake = {
        direction: 'right',
        pendingDirections: [],
        body: [
            { x: 2, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 0 }
        ]
    };

    $('#game-board').empty();

    updateScore();
    createGameboard(game.size);
    drawSnake(snake);
    addFruit();
}

function startGame() {
    endGame();
    toggleOverlay();
    initGame();
    runGame();
}

function runGame() {
    gameLoop = setInterval(() => {
        const growSnake = checkFruit();

        if (growSnake) {
            addFruit();
            game.score += 1;
            updateScore();
        }

        moveSnake(growSnake);

        if (hasCollision()) {
            endGame();
            return;
        }

        drawSnake();
    }, game.speed);
}

function endGame() {
    toggleOverlay();
    clearInterval(gameLoop);
    gameLoop = null;
}

// END GAME LIFECYCLE FUNCTIONS

// BEGIN SNAKE FUNCTIONS


function getNextCell(head, direction) {
    switch(direction) {
        case 'right':
            return { x: head.x + 1, y: head.y };
        case 'left':
            return { x: head.x - 1, y: head.y };
        case 'down':
            return { x: head.x, y: head.y + 1 };
        case 'up':
            return { x: head.x, y: head.y - 1 };
    }
}

function moveSnake(growSnake) {
    if (snake.pendingDirections.length) {
        const nextDirection = snake.pendingDirections.shift();
        const isOpposite =
            snake.direction === 'left' && nextDirection === 'right' ||
            snake.direction === 'right' && nextDirection === 'left' ||
            snake.direction === 'up' && nextDirection === 'down' ||
            snake.direction === 'down' && nextDirection === 'up';

        if (!isOpposite) {
            snake.direction = nextDirection;
        }
    }

    const head = snake.body[0];
    const newHead = getNextCell(head, snake.direction);

    snake.body.unshift(newHead);

    if (!growSnake) {
        snake.body.pop();
    }
}

function hasCollision() {
    const head = snake.body[0];
    let headCount = 0;

    snake.body.forEach(el => {
        if (head.x === el.x && head.y === el.y) {
            headCount++;
        }
    });

    return head.x < 0 || head.x > game.size - 1 ||
        head.y < 0 || head.y > game.size -1 ||
        headCount > 1;
}

// END SNAKE FUNCTIONS

// BEGIN FRUIT FUNCTIONS

function addFruit() {
    let coords;

    function generateRandomCoordinates() {
        return {
            x: Math.floor(Math.random() * game.size),
            y: Math.floor(Math.random() * game.size)
        };
    }

    do {
        coords = generateRandomCoordinates();
    } while (snake.body.find(cell => cell.x === coords.x && cell.y === coords.y));

    game.fruit = coords;
    drawFruit(coords);
}


function checkFruit() {
    return snake.body.find(cell => cell.x === game.fruit.x && cell.y === game.fruit.y);
}

// END FRUIT FUNCTIONS

// BEGIN INPUT HANDLING

function onKeyDown(e) {
    e = e || window.event;

    switch(e.key) {
        case 'd':
        case 'ArrowRight':
            snake.pendingDirections.push('right');
            break;
        case 'a':
        case 'ArrowLeft':
            snake.pendingDirections.push('left');
            break;
        case 's':
        case 'ArrowDown':
            snake.pendingDirections.push('down');
            break;
        case 'w':
        case 'ArrowUp':
            snake.pendingDirections.push('up');
            break;
        case ' ':
            startGame();
            break;
        case 'Escape':
            endGame();
            break;
    }
}

// END INPUT HANDLING