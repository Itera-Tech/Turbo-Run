const ASSETS = {
    COLOR: {
        TAR: ["#555555", "#666666"],
        RUMBLE: ["#AAAAAA", "#BBBBBB"],
        GRASS: ["#228B22", "#32CD32"]
    },
    IMAGE: {
        TREE: {
            src: "https://opengameart.org/sites/default/files/_tree_01_prev_0.png",
            width: 150,
            height: 180,
        },
        HERO: {
            src: "./images/car1.png",
            width: 110,
            height: 60,
        },
        CAR: {
            src: "images/car04.png",
            width: 50,
            height: 36,
        },
        FINISH: {
            src: "images/finish.png",
            width: 339,
            height: 180,
            offset: -0.5,
        },
        SKY: {
            src: "https://opengameart.org/sites/default/files/cloud_scene_preview.png",
        },
    },
};


Number.prototype.pad = function (numZeros, char = '0') {
    return Math.abs(this).toString().padStart(numZeros, char);
};

Number.prototype.clamp = function (min, max) {
    return Math.max(min, Math.min(this, max));
};

const timestamp = () => new Date().getTime();
const accelerate = (v, accel, dt) => v + accel * dt;
const isCollide = (x1, w1, x2, w2) => Math.abs(x1 - x2) <= (w2 + w1) / 2;

function getRand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomProperty(obj) {
    const keys = Object.keys(obj);
    return obj[keys[Math.floor(Math.random() * keys.length)]];
}

function drawQuad(element, layer, color, x1, y1, w1, x2, y2, w2) {
    element.style.zIndex = layer;
    element.style.background = color;
    element.style.top = `${y2}px`;
    element.style.left = `${x1 - w1 / 2 - w1}px`;
    element.style.width = `${w1 * 3}px`;
    element.style.height = `${y1 - y2}px`;

    const leftOffset = w1 + x2 - x1 + Math.abs(w2 / 2 - w1 / 2);
    element.style.clipPath = `polygon(${leftOffset}px 0, ${leftOffset + w2}px 0, 66.66% 100%, 33.33% 100%)`;
}


const KEYS = {};
const keyUpdate = (e) => {
    KEYS[e.code] = e.type === 'keydown';
    e.preventDefault();
};
addEventListener('keydown', keyUpdate);
addEventListener('keyup', keyUpdate);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


class Line {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.X = 0;
        this.Y = 0;
        this.W = 0;
        this.curve = 0;
        this.scale = 0;
        this.elements = [];
        this.special = null;
    }

    project(camX, camY, camZ) {
        this.scale = camD / (this.z - camZ);
        this.X = (1 + this.scale * (this.x - camX)) * halfWidth;
        this.Y = Math.ceil(((1 - this.scale * (this.y - camY)) * height) / 2);
        this.W = this.scale * roadW * halfWidth;
    }

    clearSprites() {
        this.elements.forEach(e => e.style.background = 'transparent');
    }

    drawSprite(depth, layer, sprite, offset) {
        const destX = this.X + this.scale * halfWidth * offset;
        const destY = this.Y + 4;
        const destW = (sprite.width * this.W) / 265;
        const destH = (sprite.height * this.W) / 265;

        const obj = layer instanceof Element ? layer : this.elements[layer + 6];
        obj.style.background = `url('${sprite.src}') no-repeat`;
        obj.style.backgroundSize = `${destW}px ${destH}px`;
        obj.style.left = `${destX + destW * offset}px`;
        obj.style.top = `${destY + destH * -1}px`;
        obj.style.width = `${destW}px`;
        obj.style.height = `${destH}px`;
        obj.style.zIndex = depth;
    }
}

class Car {
    constructor(pos, type, lane) {
        this.pos = pos;
        this.type = type;
        this.lane = lane;
        this.element = document.createElement("div");
        road.appendChild(this.element);
    }
}

const width = 1000;
const halfWidth = width / 2;
const height = 650;
const roadW = 4000;
const segL = 200;
const camD = 0.2;
const H = 1500;
const N = 70;

const maxSpeed = 300;
const accel = 50;
const breaking = -80;
const decel = -35;
const maxOffSpeed = 50;
const offDecel = -65;
const enemy_speed = 10;
const hitSpeed = 30;

const LANE = {
    A: -2.3,
    B: -0.5,
    C: 1.2,
};

const mapLength = 600;


let inGame, start, playerX, speed, scoreVal, pos, cloudOffset, sectionProg, mapIndex, countDown;
let lines = [];
let cars = [];
let highscores = [];


function genMap() {
    const map = [];
    let i = 0;

    const sectionTypes = [
        { probability: 0.1, curve: true, height: true },
        { probability: 0.2, curve: false, height: 'sin' },
        { probability: 0.2, curve: false, height: true },
        { probability: 0.5, curve: true, height: false }
    ];

    function createSection(type, i) {
        const section = {
            from: i,
            to: i + getRand(300, 600)
        };

        const randHeight = getRand(-10, 10);
        const randCurve = getRand(10, 50) * (Math.random() >= 0.5 ? 1 : -1);
        const randInterval = getRand(10, 30);

        if (type.curve) {
            section.curve = () => randCurve;
        } else {
            section.curve = () => 0;
        }

        if (type.height === true) {
            section.height = () => randHeight;
        } else if (type.height === 'sin') {
            section.height = (j) => Math.sin(j / randInterval) * 1000;
        } else {
            section.height = () => 0;
        }

        return section;
    }

    while (i < mapLength) {
        const rand = Math.random();
        let cumulativeProbability = 0;

        for (const type of sectionTypes) {
            cumulativeProbability += type.probability;
            if (rand < cumulativeProbability) {
                const section = createSection(type, i);
                map.push(section);
                i = section.to;
                break;
            }
        }
    }

    map.push({
        from: i,
        to: i + N,
        curve: () => 0,
        height: () => 0,
        special: ASSETS.IMAGE.FINISH,
    });
    map.push({ from: Infinity });

    return map;
}


let map = genMap();

addEventListener('keyup', function (e) {
    if (e.code === "KeyC" && !inGame) {
        e.preventDefault();
        startCountdown();
    } else if (e.code === "Escape") {
        e.preventDefault();
        reset();
    }
});


function update(step) {
    pos += speed;
    while (pos >= N * segL) pos -= N * segL;
    while (pos < 0) pos += N * segL;

    const startPos = Math.floor(pos / segL);
    const endPos = (startPos + N - 1) % N;

    scoreVal += speed * step;
    countDown -= step;

    playerX -= (lines[startPos].curve / 5000) * step * speed;

    if (KEYS.ArrowRight) {
        hero.style.backgroundPosition = "-220px 0";
        playerX += 0.007 * step * speed;
    } else if (KEYS.ArrowLeft) {
        hero.style.backgroundPosition = "0 0";
        playerX -= 0.007 * step * speed;
    } else {
        hero.style.backgroundPosition = "-110px 0";
    }

    playerX = playerX.clamp(-3, 3);

    if (inGame && KEYS.ArrowUp) speed = accelerate(speed, accel, step);
    else if (KEYS.ArrowDown) speed = accelerate(speed, breaking, step);
    else speed = accelerate(speed, decel, step);

    if (Math.abs(playerX) > 0.55 && speed >= maxOffSpeed) {
        speed = accelerate(speed, offDecel, step);
    }

    speed = speed.clamp(0, maxSpeed);


    const current = map[mapIndex];
    const use = current.from < scoreVal && current.to > scoreVal;
    if (use) sectionProg += speed * step;
    lines[endPos].curve = use ? current.curve(sectionProg) : 0;
    lines[endPos].y = use ? current.height(sectionProg) : 0;
    lines[endPos].special = null;

    if (current.to <= scoreVal) {
        mapIndex++;
        sectionProg = 0;
        lines[endPos].special = map[mapIndex].special;
    }


    if (!inGame) {
        speed = accelerate(speed, breaking, step);
    } else if (countDown <= 0 || lines[startPos].special) {
        endGame();
    } else {
        updateHUD();
    }


    updateCloud(startPos, step);
    updateCars(startPos, endPos, step);
    updateRoad(startPos);
}

function updateCloud(startPos, step) {
    cloudOffset -= lines[startPos].curve * step * speed * 0.13;
    cloud.style.backgroundPosition = `${cloudOffset | 0}px 0`;
}

function updateCars(startPos, endPos, step) {
    for (let car of cars) {
        car.pos = (car.pos + enemy_speed * step) % N;

        if (Math.floor(car.pos) === endPos) {
            if (speed < 30) car.pos = startPos;
            else car.pos = endPos - 2;
            car.lane = randomProperty(LANE);
        }

        const offsetRatio = 5;
        if (
            Math.floor(car.pos) === startPos &&
            isCollide(playerX * offsetRatio + LANE.B, 0.5, car.lane, 0.5)
        ) {
            speed = Math.min(hitSpeed, speed);
        }
    }
}

function updateRoad(startPos) {
    let maxy = height;
    let camH = H + lines[startPos].y;
    let x = 0;
    let dx = 0;

    for (let n = startPos; n < startPos + N; n++) {
        const l = lines[n % N];
        const level = N * 2 - n;

        l.project(
            playerX * roadW - x,
            camH,
            startPos * segL - (n >= N ? N * segL : 0)
        );
        x += dx;
        dx += l.curve;

        l.clearSprites();

        if (n % 10 === 0) l.drawSprite(level, 0, ASSETS.IMAGE.TREE, -2);
        if ((n + 5) % 10 === 0) l.drawSprite(level, 0, ASSETS.IMAGE.TREE, 1.3);

        if (l.special) l.drawSprite(level, 0, l.special, l.special.offset || 0);

        for (let car of cars)
            if (Math.floor(car.pos) === n % N)
                l.drawSprite(level, car.element, car.type, car.lane);

        if (l.Y >= maxy) continue;
        maxy = l.Y;

        const even = Math.floor(n / 2) % 2;
        const grass = ASSETS.COLOR.GRASS[even];
        const rumble = ASSETS.COLOR.RUMBLE[even];
        const tar = ASSETS.COLOR.TAR[even];

        const p = lines[(n - 1) % N];

        drawQuad(l.elements[0], level, grass, width / 4, p.Y, halfWidth + 2, width / 4, l.Y, halfWidth);
        drawQuad(l.elements[1], level, grass, (width / 4) * 3, p.Y, halfWidth + 2, (width / 4) * 3, l.Y, halfWidth);
        drawQuad(l.elements[2], level, rumble, p.X, p.Y, p.W * 1.15, l.X, l.Y, l.W * 1.15);
        drawQuad(l.elements[3], level, tar, p.X, p.Y, p.W, l.X, l.Y, l.W);

        if (!even) {
            drawQuad(l.elements[4], level, ASSETS.COLOR.RUMBLE[1], p.X, p.Y, p.W * 0.4, l.X, l.Y, l.W * 0.4);
            drawQuad(l.elements[5], level, tar, p.X, p.Y, p.W * 0.35, l.X, l.Y, l.W * 0.35);
        }
    }
}

function reset() {
    inGame = false;
    start = timestamp();
    countDown = map[map.length - 2].to / 130 + 10;
    playerX = 0;
    speed = 0;
    scoreVal = 0;
    pos = 0;
    cloudOffset = 0;
    sectionProg = 0;
    mapIndex = 0;

    lines.forEach(line => {
        line.curve = 0;
        line.y = 0;
    });

    updateUI('reset');
}

function startCountdown() {
    text.classList.remove("blink");
    let count = 3;
    const countdownInterval = setInterval(() => {
        if (count > 0) {
            text.innerText = count;
            count--;
        } else {
            clearInterval(countdownInterval);
            startGame();
        }
    }, 1000);
}

function startGame() {
    reset();
    inGame = true;
    start = timestamp();
    updateUI('start');
}

function endGame() {
    inGame = false;
    updateUI('end');
    highscores.push(lap.innerText);
    highscores.sort();
    updateHighscore();
}
function updateUI(state) {
    switch (state) {
        case 'reset':
            text.innerText = "Press C to start";
            text.classList.add("blink");
            road.style.opacity = 0.4;
            hud.style.display = "none";
            home.style.display = "block";
            tacho.style.display = "block";
            break;
        case 'start':
            home.style.display = "none";
            road.style.opacity = 1;
            hero.style.display = "block";
            hud.style.display = "block";
            break;
        case 'end':
            tacho.style.display = "none";
            home.style.display = "block";
            road.style.opacity = 0.4;
            text.innerText = "Press C To Start";
            break;
    }
}

function updateHUD() {
    time.innerText = Math.floor(countDown).pad(3);
    score.innerText = Math.floor(scoreVal).pad(8);
    tacho.innerText = Math.floor(speed);

    const currentTime = new Date(timestamp() - start);
    lap.innerText = `${currentTime.getMinutes()}'${currentTime.getSeconds().pad(2)}"${currentTime.getMilliseconds().pad(3)}`;
}

function updateHighscore() {
    const hN = Math.min(12, highscores.length);
    for (let i = 0; i < hN; i++) {
        highscore.children[i].innerHTML = `${(i + 1).pad(2, "&nbsp;")}. ${highscores[i]}`;
    }
}

function init() {

    game.style.width = width + "px";
    game.style.height = height + "px";


    hero.style.top = height - 120 + "px";
    hero.style.left = halfWidth - ASSETS.IMAGE.HERO.width / 2 + "px";
    hero.style.background = `url(${ASSETS.IMAGE.HERO.src})`;
    hero.style.width = `${ASSETS.IMAGE.HERO.width}px`;
    hero.style.height = `${ASSETS.IMAGE.HERO.height}px`;


    cloud.style.backgroundImage = `url(${ASSETS.IMAGE.SKY.src})`;


    const carPositions = [0, 10, 20, 35, 50, 60, 70];
    carPositions.forEach(pos => {
        cars.push(new Car(pos, ASSETS.IMAGE.CAR, randomProperty(LANE)));
    });

    for (let i = 0; i < N; i++) {
        const line = new Line();
        line.z = i * segL + 270;

        for (let j = 0; j < 8; j++) {
            const element = document.createElement("div");
            road.appendChild(element);
            line.elements.push(element);
        }

        lines.push(line);
    }

    for (let i = 0; i < 12; i++) {
        const element = document.createElement("p");
        highscore.appendChild(element);
    }
    updateHighscore();

    reset();


    let lastTime = timestamp();
    const targetFrameRate = 1000 / 60;

    function gameLoop() {
        const now = timestamp();
        const delta = now - lastTime;

        if (delta > targetFrameRate) {
            lastTime = now - (delta % targetFrameRate);
            update(delta / 1000);
        }

        requestAnimationFrame(gameLoop);
    }

    gameLoop();
}


init();