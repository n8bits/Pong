let gameLoop;
let game;
let physics;
let computer;
let initialized = false;

// Dimensions of game objects expressed as percentage of total board width (makes resizing easier)
const paddleWidth = 1;
const paddleHeight = 15;
const ballSize = 1;
const fontSize = 6;

$(function () {
    initGame();
    beginGame();
    $(document).mousemove(onMouseMove);
    $('#canvas').click(serveBall);
    fadeElementIn("message", 800);
});

function fadeElementIn(elementId, duration){

    var element = document.getElementById(elementId);
    var step = 1 / (duration / 10);
    element.style.opacity = "0.0";
    var fadeInInterval = setInterval(() => {
        
        var element = document.getElementById(elementId);
        var currentOpacity = parseFloat(element.style.opacity);
        if(currentOpacity < 1){
            currentOpacity+=step;
            element.style.opacity = currentOpacity;
        }else{
            clearInterval(fadeInInterval);
        }
    }, 10);
}

function fadeElementOut(elementId, duration){

    var element = document.getElementById(elementId);
    var step = 1 / (duration / 10);
    element.style.opacity = "1.0";
    var fadeOutInterval = setInterval(() => {
        
        var element = document.getElementById(elementId);
        var currentOpacity = parseFloat(element.style.opacity);
        if(currentOpacity > 0){
            currentOpacity-=step;
            element.style.opacity = currentOpacity;
        }else{
            clearInterval(fadeOutInterval);
        }
    }, 10);
}

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
        difficulty: 3, // from 1 to 100
        serving: true
    };

    physics = {
        paddle1: {
            lastPosition: 50,
            velocity: 0
        },
        paddle2: {
            lastPosition: 50,
            velocity: 0,
            acceleration: 0
        },
        lastTick: performance.now() // used to get elapsed time for physics calculations
    };

    // These values are used in a PID-like algorithm to control the computer's paddle
    computer = {
        lastError: 0,
        accumulatedError: 0,
        porportionalErrorMultiplier: 0.0000005,
        derivativeErrorMultiplier: 0.0000000000,
        integratedErrorMultiplier: 0.00000000000001,
        dampening: 0.751,
        reactionSpeed: 50 // 1 to 100 - determines how close the ball must be to the computer before the computer responds
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

    setInterval(() => {
        controlComputer();
    }, 7);
}

// Resets the ball after a player has scored
function resetBall() {
    game.serving = true;
    game.ballVelX = 0;
    game.ballVelY = 0;
    game.ballPosX = -1; // ball needs to be moved in bounds to prevent additional points being tallied 
    game.ballPosY = -1;
}

function serveBall() {
    if(!initialized){
        fadeElementIn("message", 600);
        document.getElementById("message").innerText = "The computer will get harder the more you score. Try and keep up!"
    }

    initialized = true;

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
        game.difficulty+=1;
        resetBall();
    }

    if (game.ballPosX < 0) {
        game.player2Score += 1;
        resetBall();
    }
}
//******************************************* */


function onMouseMove(e) {

    // paddle moves with the mouse cursor
    const canvas = document.querySelector("#canvas");
    var canvasBounds = canvas.getBoundingClientRect();
    var paddleY = Math.max(0, e.clientY - canvasBounds.y);

    if (paddleY != 0) {
        paddleY = Math.min(canvas.height, e.clientY - canvasBounds.y);
    }

    var paddlePos = (paddleY / canvas.height) * 100;

    // Prevent the paddle from being half on screen
    if (paddlePos - (paddleHeight / 2) < 0) {
        paddlePos = (paddleHeight / 2);
    } else if (paddlePos + (paddleHeight / 2) > 100) {
        paddlePos = 100 - (paddleHeight / 2);
    }
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

//************** PHYSICS *******************
function doPhysics() {
    var elapsedTime = (performance.now() - physics.lastTick);

    // calculate and store the paddle velocity (used to calculate ball acceleration)
    physics.paddle1.velocity = (game.p1PaddlePos - physics.paddle1.lastPosition) / elapsedTime;
    physics.paddle1.lastPosition = game.p1PaddlePos;

    physics.paddle2.lastPosition = game.p2PaddlePos;

    if (!game.serving) {
        checkCollisions();
        checkScores();
    }

    var dx = game.ballVelX * elapsedTime * 15;
    var dy = game.ballVelY * elapsedTime * 15;

    game.ballPosX += dx;
    game.ballPosY += dy;

    var da = physics.paddle2.acceleration * elapsedTime * 15;
    
    dy = physics.paddle2.velocity * elapsedTime * 15;
    game.p2PaddlePos += dy;
    physics.paddle2.velocity += da;

    physics.lastTick = performance.now();
}

function controlComputer() {

    // How far off target are we
    var elapsedTime = (performance.now() - physics.lastTick);
    var target = game.ballPosY;
    var porportionalError = target - game.p2PaddlePos;
    var adjustedPorpotionalModifier = (computer.porportionalErrorMultiplier) + (game.difficulty / 100000); //modulate computer response based on difficulty
    if(!ballInReactionRange()){
        adjustedPorpotionalModifier /= 5;
    }
    // How quickly is error decreasing?
    var changeInError = computer.lastError - porportionalError;
    var adjustment = (porportionalError * adjustedPorpotionalModifier) 
    + (changeInError * computer.derivativeErrorMultiplier)
    + (computer.accumulatedError * computer.integratedErrorMultiplier);

    physics.paddle2.velocity *= computer.dampening;

    if(game.ballPosX > computer.reactionSpeed || true){
        physics.paddle2.velocity += adjustment;
    }
    
    computer.lastError = porportionalError;
    computer.accumulatedError += porportionalError; // steady state error
}

function ballInReactionRange() {
    return game.ballPosX > computer.reactionSpeed;
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
        var impactOffset = (game.p1PaddlePos - game.ballPosY) / (paddleHeight/2);
        var xVelocityChange = (physics.paddle1.velocity / 100) * impactOffset;
        game.ballVelY += physics.paddle1.velocity / 100;
        game.ballVelX *= -1;
        game.ballPosX = paddleWidth + (ballSize);
        computer.reactionSpeed = (Math.random() * 100); // randomly set how quickly the computer will respond to the shot
    }

    // Check collision with right paddle (can only intersect on right side)
    var ball = getBallBounds();

    if (ball.x + ball.radius >= paddle2Bounds.x1 && ball.y + ball.radius > paddle2Bounds.y1 && ball.y - ball.radius < paddle2Bounds.y2) {
        var bounceAngle = Math.atan2(game.ballVelX, game.ballVelY);
        game.ballVelY += physics.paddle2.velocity / 100;
        game.ballVelX *= -1;
        game.ballPosX = 100 - paddleWidth - ballSize;
    }

    // Check collisions with top and bottom walls
    if (ball.y - ball.radius <= 0) {
        game.ballPosY = 0 + (ballSize * 2);
        game.ballVelY *= -1;
    }

    if (ball.y + ball.radius >= canvas.height) {
        game.ballPosY = 100 - (ballSize * 2);
        game.ballVelY *= -1;
    }
}
/******************************************/

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
