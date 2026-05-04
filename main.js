// space game - my version
// started from scratch, got help from stackoverflow for the canvas stuff

var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// game state
var score = 0;
var hp = 100;
var shields = 3;
var waveNum = 1;
var dead = false;
var canShoot = true;

// lists
var bullets = [];
var badguys = [];
var plist = []; // particles
var booms = [];

// player obj
var player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    w: 28,
    h: 36,
    spd: 5,
    // vel
    vx: 0
};

var pressed = {};

document.addEventListener('keydown', function(e) {
    pressed[e.key] = true;
    if (e.key == ' ') {
        e.preventDefault();
        tryShoot();
    }
});
document.addEventListener('keyup', function(e) {
    pressed[e.key] = false;
});

window.addEventListener('resize', function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});


// particles
function makeParticle(x, y, vx, vy, col, life) {
    return {
        x: x, y: y,
        vx: vx, vy: vy,
        color: col,
        life: life || 0.7,
        maxlife: life || 0.7,
        sz: Math.random() * 3 + 1
    };
}

function updateParticle(p) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life -= 0.025;
}

function drawParticle(p) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxlife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.sz, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
}


// -- bullets --
function makeBullet(x, y) {
    return { x:x, y:y, w:3, h:13, spd:9 };
}

function drawBullet(b) {
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(b.x - 1.5, b.y, b.w, b.h);
    // simple glow
    ctx.fillStyle = 'rgba(255,102,0,0.3)';
    ctx.fillRect(b.x - 4, b.y - 2, 8, b.h + 4);
}


// enemy "class" using a plain function bc classes felt overkill
function Enemy(x, y, type) {
    this.x = x;
    this.y = y;
    this.w = 22;
    this.h = 28;
    this.spd = Math.random() * 1.8 + 1.2;
    this.type = type || 'normal';
    this.hp = this.type == 'big' ? 8 : 1;
    this.maxhp = this.hp;
    this.wob = Math.random() * 100; // wobble offset
}

Enemy.prototype.update = function() {
    this.y += this.spd;
    this.x += Math.sin((this.y * 0.02) + this.wob) * 1.5;
};

Enemy.prototype.draw = function() {
    ctx.save();

    // big guys are brighter
    if (this.type == 'big') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = '#ffffff';
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.strokeStyle = '#ff6600';
    }

    // diamond shape
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.h/2);
    ctx.lineTo(this.x + this.w/2, this.y);
    ctx.lineTo(this.x, this.y + this.h/2);
    ctx.lineTo(this.x - this.w/2, this.y);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // hp bar for big guys
    if (this.type == 'big' && this.hp < this.maxhp) {
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - 14, this.y - this.h/2 - 10, 28, 4);
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(this.x - 14, this.y - this.h/2 - 10, 28*(this.hp/this.maxhp), 4);
    }

    ctx.restore();
};


// explosion ring thing
function Boom(x, y, big) {
    this.x = x;
    this.y = y;
    this.r = 2;
    this.maxr = big ? 65 : 35;
    this.life = 1.0;
}

Boom.prototype.update = function() {
    this.r += 2.5;
    this.life -= 0.055;
};

Boom.prototype.draw = function() {
    if(this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life * 0.8;
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
    ctx.stroke();
    // inner ring
    if (this.r > 8) {
        ctx.globalAlpha = this.life * 0.4;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r * 0.55, 0, Math.PI*2);
        ctx.stroke();
    }
    ctx.restore();
};


function tryShoot() {
    if (dead) return;
    if (!canShoot) return;

    bullets.push(makeBullet(player.x, player.y - 18));

    // shoot cooldown (Change this to cheat)
    canShoot = false;
    setTimeout(function(){ canShoot = true; }, 130);

    // little muzzle flash particles
    for (var i = 0; i < 5; i++) {
        plist.push(makeParticle(
            player.x,
            player.y - 10,
            (Math.random()-0.5)*3,
            -Math.random()*4 - 1,
            '#ff6600',
            0.4
        ));
    }
}


function spawnWave() {
    var count = Math.min(4 + waveNum, 14);
    for (var i = 0; i < count; i++) {
        var ex = Math.random() * (canvas.width - 60) + 30;
        var type = (waveNum > 4 && Math.random() < 0.22) ? 'big' : 'normal';
        badguys.push(new Enemy(ex, -40, type));
    }
    document.getElementById('waveMsg').textContent = 'wave ' + waveNum + ' — ' + count + ' incoming';
}


function movePlayer() {
    if (pressed['ArrowLeft'] || pressed['a']) player.vx = -player.spd;
    else if (pressed['ArrowRight'] || pressed['d']) player.vx = player.spd;
    else player.vx = 0;

    player.x += player.vx;

    // clamp to screen
    if (player.x < player.w) player.x = player.w;
    if (player.x > canvas.width - player.w) player.x = canvas.width - player.w;
}


function drawPlayer() {
    ctx.save();

    // ship body  white fill, orange outline
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.h/2);
    ctx.lineTo(player.x - player.w/2, player.y + player.h/2);
    ctx.lineTo(player.x, player.y + player.h/4);
    ctx.lineTo(player.x + player.w/2, player.y + player.h/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // thruster flame basic triangle & i hate this
    ctx.fillStyle = '#ff6600';
    ctx.globalAlpha = 0.7 + Math.random()*0.3;
    ctx.beginPath();
    ctx.moveTo(player.x - 6, player.y + player.h/2);
    ctx.lineTo(player.x + 6, player.y + player.h/2);
    ctx.lineTo(player.x, player.y + player.h/2 + 10 + Math.random()*6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function hitTest(a, b, aw, bw, ah, bh) {
    // basic rect overlap 
    return Math.abs(a.x - b.x) < (aw + bw)/2 &&
           Math.abs(a.y - b.y) < (ah + bh)/2;
}

function checkHits() {
    // bullet vs enemy hehehe
    for (var bi = bullets.length-1; bi >= 0; bi--) {
        for (var ei = badguys.length-1; ei >= 0; ei--) {
            var b = bullets[bi];
            var e = badguys[ei];
            if (!b || !e) continue;

            if (hitTest(b, e, b.w, e.w, b.h, e.h)) {
                e.hp--;
                bullets.splice(bi, 1);

                // hit sparks boom
                for (var k=0; k<6; k++) {
                    plist.push(makeParticle(
                        e.x + (Math.random()-0.5)*15,
                        e.y + (Math.random()-0.5)*15,
                        (Math.random()-0.5)*5,
                        (Math.random()-0.5)*5,
                        k%2==0 ? '#ff6600' : '#ffffff',
                        0.8
                    ));
                }

                if (e.hp <= 0) {
                    booms.push(new Boom(e.x, e.y, e.type=='big'));
                    score += e.type=='big' ? 400 : 100;
                    badguys.splice(ei, 1);
                }
                break; // bullet is gone stop inner loop
            }
        }
    }

    // player vs enemy hehehe
    for (var i = badguys.length-1; i >= 0; i--) {
        var en = badguys[i];
        if (hitTest(player, en, player.w, en.w, player.h, en.h)) {
            hp -= 12;
            booms.push(new Boom(en.x, en.y, false));
            badguys.splice(i, 1);

            if (hp <= 0) {
                hp = 0;
                dead = true;
                document.getElementById('deadScreen').classList.add('show');
                document.getElementById('finalScoreTxt').textContent = 'score: ' + score;
            }
        }
    }
}

function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('health').textContent = Math.ceil(hp);
    document.getElementById('shields').textContent = shields;

    var pct = (hp / 100) * 100;
    document.getElementById('hpBar').style.width = pct + '%';

    // make bar go red when low stuff
    if (hp < 30) {
        document.getElementById('hpBar').style.background = '#ff2200';
    } else {
        document.getElementById('hpBar').style.background = '#ff6600';
    }
}


function update() {
    movePlayer();

    // clean up off screen stuff
    bullets = bullets.filter(function(b){ return b.y > -20; });
    badguys = badguys.filter(function(e){ return e.y < canvas.height + 60; });
    plist   = plist.filter(function(p){ return p.life > 0; });
    booms   = booms.filter(function(bm){ return bm.life > 0; });

    bullets.forEach(function(b){ b.y -= b.spd; });
    badguys.forEach(function(e){ e.update(); });
    plist.forEach(function(p){ updateParticle(p); });
    booms.forEach(function(bm){ bm.update(); });

    checkHits();

    // next wave
    if (badguys.length === 0 && !dead) {
        waveNum++;
        spawnWave();
        score += 150 * waveNum;
    }

    updateHUD();
}

function draw() {
    // trail effect just a dark overlay
    ctx.fillStyle = 'rgba(13, 13, 13, 0.35)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    plist.forEach(function(p){ drawParticle(p); });
    booms.forEach(function(bm){ bm.draw(); });
    bullets.forEach(function(b){ drawBullet(b); });
    badguys.forEach(function(e){ e.draw(); });

    if (!dead) drawPlayer();
}


function loop() {
    if (!dead) update();
    draw();
    requestAnimationFrame(loop);
}

// holding space to keep shooting
setInterval(function() {
    if (pressed[' '] && !dead) tryShoot();
}, 120);

document.getElementById('restartBtn').addEventListener('click', function() {
    location.reload();
});

// kick it off
spawnWave();
loop();