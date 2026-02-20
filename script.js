(() => {
    const canvas = document.getElementById('myCanvas');
    if (!canvas) {
      console.error('Canvas element #myCanvas not found.');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Unable to get 2D context from canvas.');
      return;
    }

    const startScreen = document.getElementById('start-screen');
    if (!startScreen) {
      console.error('Unable to get' + startScreen + '.');
      return;
    }
    
    const scoreDiv = document.getElementById('score');
    if (!scoreDiv) {
      console.error('Unable to get' + scoreDiv + '.');
      return;
    }
    
    const gameOverDiv = document.getElementById('game-over');
    if (!gameOverDiv) {
      console.error('Unable to get' + gameOverDiv + '.');
      return;
    }
    
    const finalScoreSpan = document.getElementById('final-score');
    if (!finalScoreSpan) {
      console.error('Unable to get' + finalScoreSpan + '.');
      return;
    }
    
    const startBtn = document.getElementById('start-btn');
    if (!startBtn) {
      console.error('Unable to get' + startBtn + '.');
      return;
    }
    
    const restartBtn = document.getElementById('restart-btn');
    if (!restartBtn) {
      console.error('Unable to get' + restartBtn + '.');
      return;
    }
    
    const bgMusic = document.getElementById('bg-music');
    if (!bgMusic) {
      console.error('Unable to get' + bgMusic + '.');
      return;
    }
    
    const flapSound = document.getElementById('flap-sound');
    if (!scoreDiv) {
      console.error('Unable to get' + scoreDiv + '.');
      return;
    }
    
    const scoreSound = document.getElementById('score-sound');
    if (!scoreSound) {
      console.error('Unable to get' + scoreSound + '.');
      return;
    }
    
    const width = canvas.width = 600;
    const height = canvas.height = 400;
    console.log(width, height)

    // ========== SPRITE SHEET SETUP ==========
    const birdSprite = new Image();
    birdSprite.src = 'raven_sprite.png';
    
    const spriteWidth = 271;
    const spriteHeight = 194;
    
    let playerState = 'fly';
    let gameFrame = 0;
    const staggerFrames = 4;
    
    // Setup sprite animations
    const spriteAnimations = [];
    const animationStates = [
        {
            name: 'fly',
            frames: 6,
        }
    ];
    
    animationStates.forEach((state, index) => {
        let frames = {
            loc: [],
        }
        for (let j = 0; j < state.frames; j++) {
            let positionX = j * spriteWidth;
            let positionY = index * spriteHeight;
            frames.loc.push({ x: positionX, y: positionY });
        }
        spriteAnimations[state.name] = frames;
    });
    
    // Dropdown for animation state (if you still have it)
    const dropdown = document.getElementById('animations');
    if (dropdown) {
        dropdown.addEventListener('change', function (e) {
            playerState = e.target.value;
        });
    }

    // ========== GAME STATE ==========
    let frameCount = 0;
    let score = 0;
    let gameRunning = false;

    // Glow & fade state
    let birdGlowPhase = 0;
    let birdGlowSpeed = 0.006;
    let birdFade = 1;
    let birdFadeTarget = 1;
    const birdFadeSpeed = 0.006;
    let lastTimestamp = null;

    const gravity = 0.65;
    const lift = -10.5;
    
    // Bird properties
    let birdX = 80; // Bird's world position
    let birdScreenX = 80; // Bird's position on screen (fixed)
    let birdY = height / 2;
    let birdVelocity = 0;
    const birdRadius = 30;
    const birdSpeed = 2.5; // Bird moves forward automatically
    
    // Camera offset
    let cameraX = 0;
    
    const pipeWidth = 70;
    let pipeGapMin = 180;
    let pipeGapMax = 210;
    let pipes = [];
    let pipePassedFlags = [];

    const groundHeight = 60;
    let groundOffset = 0; // For scrolling ground pattern

    // ========== PIPE FUNCTIONS ==========
    function createPipe() {
      const minPipeHeight = 50;
      const pipeGap = Math.floor(Math.random() * Math.max(1, (pipeGapMax - pipeGapMin + 1))) + pipeGapMin;
      console.log(pipeGap)
        
      const maxAvailable = height - groundHeight - pipeGap - 40;
      const maxPipeHeight = Math.max(minPipeHeight, Math.floor(maxAvailable));
      const pipeTopHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
    
      // Generate pipe ahead of the bird's world position
      const minX = birdX + 200;
      const maxX = birdX + 300;
      const randomX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;

      pipes.push({
        x: randomX,
        top: -pipeTopHeight,        // Start ABOVE screen (upper pipe emerges down)
        bottom: height,             // Start BELOW screen (lower pipe emerges up)
        gap: pipeGap,
        swayAmplitude: 0,
        swaySpeed: 0,
        swayPhase: 0,
        emerging: true,
        emergeSpeed: 2.5,
        targetTop: pipeTopHeight,
        targetBottom: pipeTopHeight + pipeGap
      });
    }

    // ========== DRAWING FUNCTIONS ==========
    function drawBird() {
      // Calculate sprite frame
      let position = Math.floor(gameFrame / staggerFrames) % spriteAnimations[playerState].loc.length;
      let frameX = spriteAnimations[playerState].loc[position].x;
      let frameY = spriteAnimations[playerState].loc[position].y;
      
      // Draw glow effect at screen position
      const glowRadius = birdRadius * 1.75;
      const pulse = 0.6 + 0.4 * Math.sin(birdGlowPhase || 0);
      const glowAlpha = Math.max(0, Math.min(1, 0.7 * pulse));
      const effectiveGlowAlpha = glowAlpha * birdFade;
      
      const gradient = ctx.createRadialGradient(birdScreenX, birdY, birdRadius / 4, birdScreenX, birdY, glowRadius);
      gradient.addColorStop(0, `rgba(255,223,89,${(effectiveGlowAlpha * 0.95).toFixed(3)})`);
      gradient.addColorStop(1, `rgba(255,223,89,0)`);
      
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(birdScreenX, birdY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw sprite sheet bird at screen position
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, birdFade));
      
      // Center the sprite on birdScreenX, birdY
      const drawWidth = spriteWidth * 0.4;
      const drawHeight = spriteHeight * 0.4;
      
      ctx.drawImage(
        birdSprite, 
        frameX, frameY, spriteWidth, spriteHeight,
        birdScreenX - drawWidth / 2, birdY - drawHeight / 2, drawWidth, drawHeight
      );
      
      ctx.restore();
    }

    function drawPipes() {
      pipes.forEach(pipe => {
        const screenX = pipe.x - cameraX;
        
        if (screenX + pipeWidth < 0 || screenX > width) return;
        
        if (pipe.emerging) {
          // Upper pipe emerges DOWN from top
          if (pipe.top < pipe.targetTop) {
            pipe.top += pipe.emergeSpeed;
          } else {
            pipe.top = pipe.targetTop;
          }
          
          // Lower pipe emerges UP from bottom
          if (pipe.bottom > pipe.targetBottom) {
            pipe.bottom -= pipe.emergeSpeed;
          } else {
            pipe.bottom = pipe.targetBottom;
          }
          
          // Check if both pipes finished emerging
          if (pipe.top >= pipe.targetTop && pipe.bottom <= pipe.targetBottom) {
            pipe.emerging = false;
          }
        }
        
        const upperH = pipe.top;
        const lowerY = pipe.bottom;

        // Draw upper pipe (only if visible)
        if (upperH > 0) {
          const gradUp = ctx.createLinearGradient(screenX, 0, screenX + pipeWidth, 0);
          gradUp.addColorStop(0, '#005500');
          gradUp.addColorStop(1, '#0a9a0a');
          ctx.fillStyle = gradUp;
          ctx.fillRect(screenX, 0, pipeWidth, upperH);

          ctx.fillStyle = 'rgba(0, 60, 0, 0.25)';
          ctx.fillRect(screenX, Math.max(0, upperH - 10), pipeWidth, 10);
        }

        // Draw lower pipe (only if visible)
        if (lowerY < height - groundHeight) {
          const gradDown = ctx.createLinearGradient(screenX, lowerY, screenX + pipeWidth, lowerY);
          gradDown.addColorStop(0, '#005500');
          gradDown.addColorStop(1, '#0a9a0a');
          ctx.fillStyle = gradDown;
          ctx.fillRect(screenX, lowerY, pipeWidth, Math.max(0, height - lowerY - groundHeight));

          ctx.fillStyle = 'rgba(0, 60, 0, 0.25)';
          ctx.fillRect(screenX, lowerY, pipeWidth, 10);
        }
      });
    }
    

    function drawGround() {
      const groundY = height - groundHeight;
      const gradGround = ctx.createLinearGradient(0, groundY, 0, height);
      gradGround.addColorStop(0, '#5d3a00');
      gradGround.addColorStop(1, '#a16600');
      ctx.fillStyle = gradGround;
      ctx.fillRect(0, groundY, width, groundHeight);

      // Scrolling ground pattern
      ctx.strokeStyle = '#874f00';
      ctx.lineWidth = 1;
      const stripeGap = 5;
      const offset = groundOffset % stripeGap;
      
      for (let i = -offset; i < width; i += stripeGap) {
        ctx.beginPath();
        ctx.moveTo(i, groundY);
        ctx.lineTo(i + stripeGap / 2, height);
        ctx.stroke();
      }
    }

    function drawBackground() {
      // Draw sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height - groundHeight);
      skyGradient.addColorStop(0, '#87ceeb');
      skyGradient.addColorStop(1, '#e0f6ff');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height - groundHeight);
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      drawBackground();
      drawPipes();
      drawGround();
      drawBird();
    }

    // ========== COLLISION DETECTION ==========
    function checkCollision() {
      if (birdY + birdRadius > height - groundHeight) return true;
      if (birdY - birdRadius < 0) return true;

      for (const pipe of pipes) {
        const upperBottom = pipe.top;
        const lowerTop = pipe.bottom;

        const birdRect = {
          left: birdX - birdRadius,
          right: birdX + birdRadius,
          top: birdY - birdRadius,
          bottom: birdY + birdRadius
        };

        const upperPipeRect = {
          left: pipe.x,
          right: pipe.x + pipeWidth,
          top: 0,
          bottom: upperBottom
        };

        const lowerPipeRect = {
          left: pipe.x,
          right: pipe.x + pipeWidth,
          top: lowerTop,
          bottom: height - groundHeight
        };

        if (rectOverlap(birdRect, upperPipeRect) || rectOverlap(birdRect, lowerPipeRect)) {
          return true;
        }
      }
      return false;
    }

    function rectOverlap(r1, r2) {
      return !(r1.left > r2.right ||
               r1.right < r2.left ||
               r1.top > r2.bottom ||
               r1.bottom < r2.top);
    }

    // ========== UPDATE LOGIC ==========
    function update(delta) {
      birdVelocity += gravity;
      birdY += birdVelocity;

      if (!Number.isFinite(birdY)) birdY = height / 2;

      // Move bird forward in world space
      birdX += birdSpeed;
      
      // Update camera to follow bird (keep bird at fixed screen position)
      cameraX = birdX - birdScreenX;
      
      // Update ground scroll
      groundOffset += birdSpeed;

      // Check if bird passes through pipes
      pipes.forEach((pipe, index) => {
        // Check if bird has passed through the pipe gap successfully
        if (!pipePassedFlags[index] && birdX > (pipe.x + pipeWidth)) {
          // Check if bird went through the gap (not collision)
          if (birdY - birdRadius > pipe.top && birdY + birdRadius < pipe.bottom) {
            score++;
            scoreDiv.textContent = score;
            pipePassedFlags[index] = true;
            playSound(scoreSound);
            
            // Spawn a new pipe when bird successfully passes through
            createPipe();
            pipePassedFlags.push(false);
          }
        }
      });

      // Remove pipes that are far behind the bird (cleanup)
      pipes = pipes.filter((pipe, index) => {
        if (pipe.x + pipeWidth < birdX - 300) {
          pipePassedFlags.splice(index, 1);
          return false;
        }
        return true;
      });
    }

    // ========== GAME LOOP ==========
    function gameLoop(timestamp) {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const delta = Math.min(200, (timestamp - lastTimestamp) || 16);
      lastTimestamp = timestamp;

      try {
        birdGlowPhase += delta * birdGlowSpeed;

        const lerpFactor = Math.min(1, birdFadeSpeed * delta);
        birdFade += (birdFadeTarget - birdFade) * lerpFactor;
        birdFade = Math.max(0, Math.min(1, birdFade));

        update(delta);
        draw();
        
        // Increment sprite animation frame
        gameFrame++;
        
        if (checkCollision()) {
          endGame();
          return;
        }
        frameCount++;
      } catch (err) {
        console.error('Error in game loop:', err);
        endGame();
        return;
      }

      if (gameRunning) requestAnimationFrame(gameLoop);
    }

    // ========== GAME CONTROL ==========
    function startGame() {
      lastTimestamp = null;
      birdFade = 0;
      birdFadeTarget = 1;
      birdX = 80;
      birdScreenX = 80;
      birdY = height / 2;
      birdVelocity = 0;
      cameraX = 0;
      groundOffset = 0;
      pipes = [];
      pipePassedFlags = [];
      frameCount = 0;
      gameFrame = 0;
      score = 0;
      pipeGapMin = 180;
      pipeGapMax = 210;
      gameRunning = true;
      scoreDiv.textContent = score;
      gameOverDiv.style.display = 'none';
      startScreen.style.display = 'none';
      playMusic();
      
      // Create the first pipe
      createPipe();
      pipePassedFlags.push(false);
      
      requestAnimationFrame(gameLoop);
    }

    function endGame() {
      gameRunning = false;
      finalScoreSpan.textContent = score;
      gameOverDiv.style.display = 'block';
      gameOverDiv.setAttribute('aria-hidden', 'false');
      birdFadeTarget = 0.35;
      stopMusic();
    }

    function flap() {
      if (!gameRunning) {
        startGame();
      }
      birdVelocity = lift;
      playSound(flapSound);
    }

    function playSound(sound) {
      if(!sound) return;
      sound.currentTime = 0;
      sound.play();
    }

    function playMusic() {
      bgMusic.volume = 0.50;
      bgMusic.play();
    }

    function stopMusic() {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    }

    // ========== EVENT LISTENERS ==========
    window.addEventListener('keydown', e => {
      if(e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        flap();
      }
    });

    canvas.addEventListener('mousedown', flap);
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      flap();
    }, { passive: false });

    startBtn.addEventListener('click', () => {
      canvas.classList.add('fade-in');
      setTimeout(() => {
        startGame();
        canvas.classList.remove('fade-in');
        canvas.focus();
      }, 500);
    });

    restartBtn.addEventListener('click', () => {
      gameOverDiv.setAttribute('aria-hidden', 'true');
      canvas.classList.add('fade-out');
      setTimeout(() => {
        startGame();
        canvas.classList.remove('fade-out');
        canvas.classList.add('fade-in');
        setTimeout(() => {
          canvas.classList.remove('fade-in');
        }, 500);
        canvas.focus();
      }, 500);
    });

    canvas.setAttribute('tabindex', '0');
    canvas.focus();
})();
