let gameLoop;
let game;
let physics;

// Dimensions of game objects expressed as percentage of total board width
const paddleWidth = 2;
const paddleHeight = 15;
const ballSize = 1.5;
const fontSize = 6;

$(function () {
    initGame();
    beginGame();
    $(document).mousemove(onMouseMove);
    $('#canvas').click(serveBall);
});

//****************** GAME LOGIC ******************

// Set the initial game state
function initGame() {
    game = {
        renderingInterval: 3,   // The time in miliseconds between frame renders
        tickInterval: 1,        // The time in milliseconds between physics calculations
        p1PaddlePos: 50,        // Paddle and ball coordinates position expressed as a percentage of game board dimensions
        p2PaddlePos: 50,
        ballPosX: 50,
        ballPosY: 50,
        ballVelX: 0,
        ballVelY: 0,
        servingSpeed: 0.004,    // Defines how quickly the ball should travel horizontally upon being served
        player1Score: 0,
        player2Score: 0,
        servingPlayer: 1,
        serving: true
    };

    physics = {
        paddle1: {
            lastPosition: 50,
            velocity: 0
        },
        paddle2: {
            lastPosition: 50,
            velocity: 0
        },
        lastTick: performance.now() // used to get elapsed time for physics calculations
    };

    physics.lastTick = performance.now();
}

// Kick off rendering and phyics loops
function beginGame() {
    setInterval(() => {
        drawGame();
    }, game.speed);

    setInterval(() => {
        doPhysics();
    }, game.tickInterval);
}

// Resets the ball after a player has scored
function resetBall() {
    game.serving = true;
    game.ballVelX = 0;
    game.ballVelY = 0;
    game.ballPosX = 50; // ball needs to be moved in bounds to prevent additional points being tallied 
    game.ballPosY = 50;
}

function serveBall() {

    if (!game.serving) {
        return;
    }

    if (game.servingPlayer === 1) {
        var randomSpeed = Math.random() / 500;
        game.ballVelY = randomSpeed;
        game.ballVelX = game.servingSpeed;
    }

    game.serving = false;
}



// Determine if a player has scored and resets as necessary
function checkScores() {
    if (game.ballPosX > 100) {
        game.player1Score += 1;
        resetBall();
    }

    if (game.ballPosX < 0) {
        game.player2Score += 1;
        resetBall();
    }
}
//******************************************* */

//***************** USER INPUT **************
function onMouseMove(e) {
    // paddle moves with the mouse cursor
    const canvas = document.querySelector("#canvas");
    var paddleY = Math.max(0, e.clientY);
    paddleY = Math.min(canvas.height, e.clientY);

    var paddlePos = (paddleY / canvas.height) * 100;

    game.p1PaddlePos = paddlePos;

    // keep the ball in the center of the serving player's paddle until it is served
    if (game.serving) {
        var paddle = getPaddle1Bounds();

        game.ballVelX = 0;
        game.ballVelY = 0;
        game.ballPosY = paddlePos;
        game.ballPosX = paddleWidth + ballSize; // just in front of the paddle
    }
}
//******************************************

//************** PHYSICS *******************
function doPhysics() {
    var elapsedTime = (performance.now() - physics.lastTick);

    // calculate and store the paddle velocity for later use
    physics.paddle1.velocity = (game.p1PaddlePos - physics.paddle1.lastPosition) / elapsedTime;
    physics.paddle1.lastPosition = game.p1PaddlePos;

    if(!game.serving){
        checkCollisions();
        checkScores();
    }
    
    var dx = game.ballVelX * elapsedTime * 15;
    var dy = game.ballVelY * elapsedTime * 15;

    game.ballPosX += dx;
    game.ballPosY += dy;

    game.p2PaddlePos = game.ballPosY;
    physics.lastTick = performance.now();
}


function checkCollisions() {
    const canvas = document.querySelector("#canvas");

    var paddle1Bounds = getPaddle1Bounds();
    var paddle2Bounds = getPaddle2Bounds();
    var ballDrawSize = getBallDrawSize();

    // Check collision with left paddle (can only intersect on right side)
    var ball = getBallBounds();

    if (ball.x - ball.radius <= paddle1Bounds.x2 && ball.y + ball.radius > paddle1Bounds.y1 && ball.y - ball.radius < paddle1Bounds.y2) {
        var bounceAngle = Math.atan2(game.ballVelX, game.ballVelY);
        game.ballVelY += physics.paddle1.velocity / 100;
        game.ballVelX *= -1;
        game.ballPosX = paddleWidth + (ballSize);
    }

    // Check collision with right paddle (can only intersect on right side)
    var ball = getBallBounds();

    if (ball.x + ball.radius >= paddle2Bounds.x1 && ball.y + ball.radius > paddle2Bounds.y1 && ball.y - ball.radius < paddle2Bounds.y2) {
        var bounceAngle = Math.atan2(game.ballVelX, game.ballVelY);
        game.ballVelX *= -1;
        game.ballPosX = 100 - paddleWidth - ballSize;

    }

    // Check collisions with top and bottom walls
    if (ball.y - ball.radius <= 0){
        game.ballPosY = 0 + (ballSize * 2);
        game.ballVelY *= -1;
    }

    if (ball.y + ball.radius >= canvas.height){
        game.ballPosY = 100 - (ballSize * 2);
        game.ballVelY *= -1;
    }
}
/******************************************/

//************ RENDERING *****************/

function drawGame() {
    const canvas = document.querySelector("#canvas");
    let context = canvas.getContext("2d");

    //Blank the screen to black
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // Draw the paddles
    context.fillStyle = "limegreen";

    // Draw player 1 paddle on the left
    paddle1Bounds = getPaddle1Bounds();
    context.fillRect(paddle1Bounds.x1, paddle1Bounds.y1, paddle1Bounds.width, paddle1Bounds.height);

    // Draw player 2 paddle on the right
    paddle2Bounds = getPaddle2Bounds();
    context.fillRect(paddle2Bounds.x1, paddle2Bounds.y1, paddle2Bounds.width, paddle2Bounds.height);

    // Draw the ball
    ballDrawSize = (ballSize / 100) * canvas.clientWidth;
    ballDrawX = ((game.ballPosX / 100) * canvas.clientWidth);
    ballDrawY = ((game.ballPosY / 100) * canvas.clientHeight);
    context.beginPath(); // <-- start a path
    context.fill();
    context.arc(ballDrawX, ballDrawY, ballDrawSize, 0, Math.PI);
    var ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(ballDrawX, ballDrawY, ballDrawSize, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.stroke();

    // Update Score
    document.getElementById("player1-score").innerText = game.player1Score;
    document.getElementById("player2-score").innerText = game.player2Score;
}
//***************************************** */

/********* COORDINATE SPACE TRANSLATION FUNCTIONS *****************/
function getBallDrawSize() {
    ballDrawSize = (ballSize / 100) * canvas.clientWidth;

    return ballDrawSize;
}

function getBallBounds() {
    ballDrawSize = getBallDrawSize();
    ballDrawX = ((game.ballPosX / 100) * canvas.clientWidth);
    ballDrawY = ((game.ballPosY / 100) * canvas.clientHeight);

    var bounds = {
        x: ballDrawX,
        y: ballDrawY,
        radius: ballDrawSize
    }

    return bounds;
}

function getPaddle1Bounds() {
    var paddleDrawWidth = (paddleWidth / 100) * canvas.clientWidth;
    var paddleDrawHeight = (paddleHeight / 100) * canvas.clientHeight;

    paddleDrawY = ((game.p1PaddlePos / 100) * canvas.clientHeight) - (paddleDrawHeight / 2);

    var bounds = {
        x1: 0,
        y1: paddleDrawY,
        x2: paddleDrawWidth,
        y2: paddleDrawHeight + paddleDrawY,
        width: paddleDrawWidth,
        height: paddleDrawHeight
    }

    return bounds;
}

function getPaddle2Bounds() {
    var paddleDrawWidth = (paddleWidth / 100) * canvas.clientWidth;
    var paddleDrawHeight = (paddleHeight / 100) * canvas.clientHeight;

    paddleDrawY = ((game.p2PaddlePos / 100) * canvas.clientHeight) - (paddleDrawHeight / 2);

    var bounds = {
        x1: (canvas.clientWidth - paddleDrawWidth),
        y1: paddleDrawY,
        x2: paddleDrawWidth,
        y2: paddleDrawHeight + paddleDrawY,
        width: paddleDrawWidth,
        height: paddleDrawHeight
    }

    return bounds;
}
/******************************************************************* */