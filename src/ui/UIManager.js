// complete UI system for the game
// includes title screen, tutorial, pause menu, settings, leaderboard
export class UIManager {
  constructor(game) {
    this.game = game;
    this.currentScreen = null;
    this.isPaused = false;
    this.hasStarted = false;
    
    // settings config
    this.settings = {
      masterVolume: 0.8,
      musicVolume: 0.5,
      sfxVolume: 0.8,
      mouseSensitivity: 1.0
    };
    
    // leaderboard top 10
    this.leaderboard = [];
    this.maxLeaderboardEntries = 10;
    
    // load saved data
    this.loadSettings();
    this.loadLeaderboard();
    
    // create UI elements
    this.createStyles();
    this.createTitleScreen();
    this.createPauseMenu();
    this.createSettingsMenu();
    this.createGameOverScreen();
    this.createLeaderboardScreen();
    this.createNameInputScreen();
    
    // setup event listeners
    this.setupEventListeners();
  }

  // inject all CSS styles for UI components
  createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700&display=swap');
      
      .ui-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      
      .ui-overlay.visible {
        opacity: 1;
        pointer-events: all;
      }
      
      .ui-panel {
        background: linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(30, 20, 40, 0.95) 100%);
        border: 2px solid #ff6600;
        border-radius: 15px;
        padding: 40px;
        box-shadow: 
          0 0 30px rgba(255, 102, 0, 0.3),
          0 0 60px rgba(255, 50, 0, 0.2),
          inset 0 0 30px rgba(255, 102, 0, 0.1);
        backdrop-filter: blur(10px);
        max-width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      .ui-title {
        font-family: 'Orbitron', monospace;
        font-size: 48px;
        font-weight: 900;
        text-align: center;
        color: #ff6600;
        text-shadow: 
          0 0 10px #ff6600,
          0 0 20px #ff3300,
          0 0 40px #ff0000;
        margin-bottom: 30px;
        letter-spacing: 4px;
        animation: titlePulse 2s ease-in-out infinite;
      }
      
      @keyframes titlePulse {
        0%, 100% { text-shadow: 0 0 10px #ff6600, 0 0 20px #ff3300, 0 0 40px #ff0000; }
        50% { text-shadow: 0 0 20px #ff6600, 0 0 40px #ff3300, 0 0 60px #ff0000; }
      }
      
      .ui-subtitle {
        font-family: 'Rajdhani', sans-serif;
        font-size: 18px;
        color: #aaa;
        text-align: center;
        margin-bottom: 40px;
      }
      
      .ui-button {
        font-family: 'Orbitron', monospace;
        font-size: 18px;
        font-weight: 700;
        padding: 15px 40px;
        margin: 10px;
        border: 2px solid #ff6600;
        border-radius: 8px;
        background: linear-gradient(180deg, rgba(255, 102, 0, 0.2) 0%, rgba(255, 50, 0, 0.1) 100%);
        color: #ff6600;
        cursor: pointer;
        transition: all 0.2s ease;
        text-transform: uppercase;
        letter-spacing: 2px;
        display: block;
        width: 100%;
        box-sizing: border-box;
      }
      
      .ui-button:hover {
        background: linear-gradient(180deg, rgba(255, 102, 0, 0.4) 0%, rgba(255, 50, 0, 0.2) 100%);
        transform: scale(1.02);
        box-shadow: 0 0 20px rgba(255, 102, 0, 0.5);
      }
      
      .ui-button:active {
        transform: scale(0.98);
      }
      
      .ui-button.secondary {
        border-color: #666;
        color: #999;
        background: linear-gradient(180deg, rgba(100, 100, 100, 0.2) 0%, rgba(50, 50, 50, 0.1) 100%);
      }
      
      .ui-button.secondary:hover {
        border-color: #888;
        color: #ccc;
        background: linear-gradient(180deg, rgba(100, 100, 100, 0.3) 0%, rgba(50, 50, 50, 0.2) 100%);
      }
      
      .tutorial-section {
        margin: 25px 0;
        padding: 20px;
        background: rgba(255, 102, 0, 0.1);
        border-left: 4px solid #ff6600;
        border-radius: 0 8px 8px 0;
      }
      
      .tutorial-title {
        font-family: 'Orbitron', monospace;
        font-size: 16px;
        color: #ff6600;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .tutorial-text {
        font-family: 'Rajdhani', sans-serif;
        font-size: 15px;
        color: #ccc;
        line-height: 1.6;
      }
      
      .key-hint {
        display: inline-block;
        padding: 4px 10px;
        background: rgba(255, 102, 0, 0.3);
        border: 1px solid #ff6600;
        border-radius: 5px;
        font-family: 'Orbitron', monospace;
        font-size: 12px;
        color: #ff6600;
        margin: 0 3px;
      }
      
      .slider-container {
        margin: 20px 0;
      }
      
      .slider-label {
        font-family: 'Rajdhani', sans-serif;
        font-size: 14px;
        color: #aaa;
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      
      .slider-value {
        color: #ff6600;
        font-weight: bold;
      }
      
      .ui-slider {
        width: 100%;
        height: 8px;
        border-radius: 4px;
        background: rgba(100, 100, 100, 0.3);
        outline: none;
        -webkit-appearance: none;
        cursor: pointer;
      }
      
      .ui-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ff6600;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(255, 102, 0, 0.5);
        transition: all 0.2s;
      }
      
      .ui-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 20px rgba(255, 102, 0, 0.8);
      }
      
      .stats-display {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin: 30px 0;
      }
      
      .stat-box {
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid #444;
        border-radius: 10px;
        padding: 15px;
        text-align: center;
      }
      
      .stat-value {
        font-family: 'Orbitron', monospace;
        font-size: 32px;
        color: #ff6600;
        text-shadow: 0 0 10px rgba(255, 102, 0, 0.5);
      }
      
      .stat-label {
        font-family: 'Rajdhani', sans-serif;
        font-size: 12px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .portal-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 20px;
        background: linear-gradient(45deg, #8b00ff, #ff00ff, #8b00ff);
        border-radius: 50%;
        animation: portalGlow 1.5s ease-in-out infinite;
        box-shadow: 0 0 30px rgba(139, 0, 255, 0.5);
      }
      
      @keyframes portalGlow {
        0%, 100% { box-shadow: 0 0 30px rgba(139, 0, 255, 0.5), 0 0 60px rgba(255, 0, 255, 0.3); }
        50% { box-shadow: 0 0 50px rgba(139, 0, 255, 0.8), 0 0 100px rgba(255, 0, 255, 0.5); }
      }
      
      .zombie-warning {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        background: rgba(255, 0, 0, 0.2);
        border: 1px solid #ff3333;
        border-radius: 8px;
        margin: 15px 0;
      }
      
      .zombie-icon {
        font-size: 40px;
      }
      
      .pause-backdrop {
        background: rgba(0, 0, 0, 0.7);
      }
      
      .title-backdrop {
        background: linear-gradient(180deg, 
          rgba(10, 5, 15, 0.95) 0%, 
          rgba(20, 10, 30, 0.9) 50%,
          rgba(30, 15, 20, 0.95) 100%);
      }
      
      .gameover-panel {
        text-align: center;
      }
      
      .gameover-title {
        font-size: 56px;
        color: #ff0000;
        text-shadow: 
          0 0 20px #ff0000,
          0 0 40px #990000;
        animation: gameoverPulse 0.5s ease-in-out infinite;
      }
      
      @keyframes gameoverPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }
      
      .victory-title {
        font-size: 56px;
        color: #00ff00;
        text-shadow: 
          0 0 20px #00ff00,
          0 0 40px #009900;
      }
      
      /* leaderboard styles */
      .leaderboard-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      
      .leaderboard-table th,
      .leaderboard-table td {
        font-family: 'Rajdhani', sans-serif;
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid rgba(255, 102, 0, 0.2);
      }
      
      .leaderboard-table th {
        font-family: 'Orbitron', monospace;
        font-size: 12px;
        color: #ff6600;
        text-transform: uppercase;
        letter-spacing: 1px;
        background: rgba(255, 102, 0, 0.1);
      }
      
      .leaderboard-table td {
        font-size: 14px;
        color: #ccc;
      }
      
      .leaderboard-table tr:hover {
        background: rgba(255, 102, 0, 0.05);
      }
      
      .leaderboard-table .rank {
        font-family: 'Orbitron', monospace;
        font-weight: bold;
        color: #ff6600;
        width: 50px;
      }
      
      .leaderboard-table .rank-1 { color: #ffd700; text-shadow: 0 0 10px #ffd700; }
      .leaderboard-table .rank-2 { color: #c0c0c0; text-shadow: 0 0 10px #c0c0c0; }
      .leaderboard-table .rank-3 { color: #cd7f32; text-shadow: 0 0 10px #cd7f32; }
      
      .leaderboard-table .name {
        font-weight: 600;
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .leaderboard-table .score {
        font-family: 'Orbitron', monospace;
        color: #ff6600;
        text-align: right;
      }
      
      .leaderboard-table .new-entry {
        animation: newEntryGlow 1s ease-in-out infinite;
        background: rgba(255, 102, 0, 0.15);
      }
      
      @keyframes newEntryGlow {
        0%, 100% { background: rgba(255, 102, 0, 0.15); }
        50% { background: rgba(255, 102, 0, 0.25); }
      }
      
      .leaderboard-empty {
        font-family: 'Rajdhani', sans-serif;
        font-size: 16px;
        color: #666;
        text-align: center;
        padding: 40px;
        font-style: italic;
      }
      
      /* name input styles */
      .name-input-container {
        margin: 30px 0;
        text-align: center;
      }
      
      .name-input {
        font-family: 'Orbitron', monospace;
        font-size: 24px;
        padding: 15px 20px;
        width: 100%;
        max-width: 300px;
        border: 2px solid #ff6600;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.5);
        color: #ff6600;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 3px;
        outline: none;
        transition: all 0.3s ease;
      }
      
      .name-input:focus {
        box-shadow: 0 0 20px rgba(255, 102, 0, 0.5);
        background: rgba(0, 0, 0, 0.7);
      }
      
      .name-input::placeholder {
        color: #664422;
        text-transform: none;
        letter-spacing: 1px;
      }
      
      .high-score-badge {
        display: inline-block;
        padding: 8px 20px;
        background: linear-gradient(135deg, #ffd700 0%, #ff6600 100%);
        border-radius: 20px;
        font-family: 'Orbitron', monospace;
        font-size: 14px;
        color: #000;
        font-weight: bold;
        margin-bottom: 20px;
        animation: badgePulse 1.5s ease-in-out infinite;
      }
      
      @keyframes badgePulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
        50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(255, 215, 0, 0.8); }
      }
      
      .score-breakdown {
        font-family: 'Rajdhani', sans-serif;
        font-size: 14px;
        color: #888;
        margin: 15px 0;
        padding: 15px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
      }
      
      .score-breakdown div {
        display: flex;
        justify-content: space-between;
        margin: 5px 0;
      }
      
      .score-breakdown .total {
        border-top: 1px solid #444;
        padding-top: 10px;
        margin-top: 10px;
        font-family: 'Orbitron', monospace;
        font-size: 18px;
        color: #ff6600;
      }
    `;
    document.head.appendChild(style);
  }

  // create main title screen with tutorial info
  createTitleScreen() {
    this.titleScreen = document.createElement('div');
    this.titleScreen.className = 'ui-overlay title-backdrop visible';
    this.titleScreen.innerHTML = `
      <div class="ui-panel" style="width: 600px;">
        <div style="font-size: 80px; margin-bottom: 20px; text-align: center;">🧟</div>
        <h1 class="ui-title">CAVE ARENA</h1>
        <p class="ui-subtitle">Defend the Portal against the zombie hordes</p>
        
        <div class="tutorial-section">
          <div class="tutorial-title">OBJECTIVE</div>
          <div class="tutorial-text">
            Protect the <strong style="color: #ff00ff;">Portal</strong> from zombies. 
            If too many zombies reach the portal, it will be destroyed!
          </div>
        </div>
        
        <div class="tutorial-section">
          <div class="tutorial-title">CONTROLS</div>
          <div class="tutorial-text">
            <span class="key-hint">W</span><span class="key-hint">A</span><span class="key-hint">S</span><span class="key-hint">D</span> - Movement<br>
            <span class="key-hint">MOUSE</span> - Aim<br>
            <span class="key-hint">LEFT CLICK</span> - Shoot<br>
            <span class="key-hint">SPACE</span> - Jump<br>
            <span class="key-hint">ESC</span> - Pause Menu
          </div>
        </div>
        
        <div class="zombie-warning">
          <div class="zombie-icon"></div>
          <div class="tutorial-text">
            <strong style="color: #ff3333;">WARNING!</strong><br>
            Zombies will spawn in increasingly larger waves. 
            Each wave = more zombies and more danger.
          </div>
        </div>
        
        <div class="tutorial-section">
          <div class="tutorial-title">TIPS</div>
          <div class="tutorial-text">
            - Keep your distance from zombies<br>
            - Watch your ammo (max 3 projectiles)<br>
            - Pay attention to portal health<br>
            - Zombies explode when reaching the portal
          </div>
        </div>
        
        <button class="ui-button" id="btn-start">START GAME</button>
        <button class="ui-button secondary" id="btn-leaderboard-title">LEADERBOARD</button>
        <button class="ui-button secondary" id="btn-settings-title">SETTINGS</button>
      </div>
    `;
    document.body.appendChild(this.titleScreen);
    
    // event listeners
    this.titleScreen.querySelector('#btn-start').addEventListener('click', () => this.startGame());
    this.titleScreen.querySelector('#btn-leaderboard-title').addEventListener('click', () => this.showLeaderboard('title'));
    this.titleScreen.querySelector('#btn-settings-title').addEventListener('click', () => this.showSettings());
  }

  // create pause menu overlay
  createPauseMenu() {
    this.pauseMenu = document.createElement('div');
    this.pauseMenu.className = 'ui-overlay pause-backdrop';
    this.pauseMenu.innerHTML = `
      <div class="ui-panel" style="width: 400px; text-align: center;">
        <h1 class="ui-title" style="font-size: 36px;">PAUSED</h1>
        
        <button class="ui-button" id="btn-resume">RESUME</button>
        <button class="ui-button secondary" id="btn-settings-pause">SETTINGS</button>
        <button class="ui-button secondary" id="btn-restart">RESTART</button>
        <button class="ui-button secondary" id="btn-quit">MAIN MENU</button>
      </div>
    `;
    document.body.appendChild(this.pauseMenu);
    
    // event listeners
    this.pauseMenu.querySelector('#btn-resume').addEventListener('click', () => this.resumeGame());
    this.pauseMenu.querySelector('#btn-settings-pause').addEventListener('click', () => this.showSettings());
    this.pauseMenu.querySelector('#btn-restart').addEventListener('click', () => this.restartGame());
    this.pauseMenu.querySelector('#btn-quit').addEventListener('click', () => this.quitToMenu());
  }

  // create settings menu with sliders
  createSettingsMenu() {
    this.settingsMenu = document.createElement('div');
    this.settingsMenu.className = 'ui-overlay pause-backdrop';
    this.settingsMenu.innerHTML = `
      <div class="ui-panel" style="width: 450px;">
        <h1 class="ui-title" style="font-size: 32px;">SETTINGS</h1>
        
        <div class="slider-container">
          <div class="slider-label">
            <span>Master Volume</span>
            <span class="slider-value" id="val-master">${Math.round(this.settings.masterVolume * 100)}%</span>
          </div>
          <input type="range" class="ui-slider" id="slider-master" min="0" max="100" value="${this.settings.masterVolume * 100}">
        </div>
        
        <div class="slider-container">
          <div class="slider-label">
            <span>Music Volume</span>
            <span class="slider-value" id="val-music">${Math.round(this.settings.musicVolume * 100)}%</span>
          </div>
          <input type="range" class="ui-slider" id="slider-music" min="0" max="100" value="${this.settings.musicVolume * 100}">
        </div>
        
        <div class="slider-container">
          <div class="slider-label">
            <span>SFX Volume</span>
            <span class="slider-value" id="val-sfx">${Math.round(this.settings.sfxVolume * 100)}%</span>
          </div>
          <input type="range" class="ui-slider" id="slider-sfx" min="0" max="100" value="${this.settings.sfxVolume * 100}">
        </div>
        
        <div class="slider-container">
          <div class="slider-label">
            <span>Mouse Sensitivity</span>
            <span class="slider-value" id="val-sensitivity">${this.settings.mouseSensitivity.toFixed(1)}x</span>
          </div>
          <input type="range" class="ui-slider" id="slider-sensitivity" min="10" max="200" value="${this.settings.mouseSensitivity * 100}">
        </div>
        
        <button class="ui-button" id="btn-settings-back" style="margin-top: 30px;">BACK</button>
      </div>
    `;
    document.body.appendChild(this.settingsMenu);
    
    // slider event listeners
    const masterSlider = this.settingsMenu.querySelector('#slider-master');
    const musicSlider = this.settingsMenu.querySelector('#slider-music');
    const sfxSlider = this.settingsMenu.querySelector('#slider-sfx');
    const sensitivitySlider = this.settingsMenu.querySelector('#slider-sensitivity');
    
    masterSlider.addEventListener('input', (e) => {
      this.settings.masterVolume = e.target.value / 100;
      this.settingsMenu.querySelector('#val-master').textContent = `${Math.round(this.settings.masterVolume * 100)}%`;
      this.applyAudioSettings();
    });
    
    musicSlider.addEventListener('input', (e) => {
      this.settings.musicVolume = e.target.value / 100;
      this.settingsMenu.querySelector('#val-music').textContent = `${Math.round(this.settings.musicVolume * 100)}%`;
      this.applyAudioSettings();
    });
    
    sfxSlider.addEventListener('input', (e) => {
      this.settings.sfxVolume = e.target.value / 100;
      this.settingsMenu.querySelector('#val-sfx').textContent = `${Math.round(this.settings.sfxVolume * 100)}%`;
      this.applyAudioSettings();
    });
    
    sensitivitySlider.addEventListener('input', (e) => {
      this.settings.mouseSensitivity = e.target.value / 100;
      this.settingsMenu.querySelector('#val-sensitivity').textContent = `${this.settings.mouseSensitivity.toFixed(1)}x`;
      this.applySensitivity();
    });
    
    this.settingsMenu.querySelector('#btn-settings-back').addEventListener('click', () => this.hideSettings());
  }

  // create game over screen with stats
  createGameOverScreen() {
    this.gameOverScreen = document.createElement('div');
    this.gameOverScreen.className = 'ui-overlay pause-backdrop';
    this.gameOverScreen.innerHTML = `
      <div class="ui-panel gameover-panel" style="width: 500px;">
        <h1 class="ui-title gameover-title" id="gameover-title">GAME OVER</h1>
        <p class="ui-subtitle" id="gameover-subtitle">The portal has been destroyed</p>
        
        <div class="stats-display">
          <div class="stat-box">
            <div class="stat-value" id="stat-waves">0</div>
            <div class="stat-label">Waves Survived</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" id="stat-kills">0</div>
            <div class="stat-label">Zombies Killed</div>
          </div>
        </div>
        
        <div class="score-breakdown">
          <div><span>Waves (x100)</span><span id="score-waves">0</span></div>
          <div><span>Kills (x10)</span><span id="score-kills">0</span></div>
          <div class="total"><span>TOTAL SCORE</span><span id="score-total">0</span></div>
        </div>
        
        <button class="ui-button" id="btn-retry">RETRY</button>
        <button class="ui-button secondary" id="btn-leaderboard-gameover">LEADERBOARD</button>
        <button class="ui-button secondary" id="btn-menu">MAIN MENU</button>
      </div>
    `;
    document.body.appendChild(this.gameOverScreen);
    
    this.gameOverScreen.querySelector('#btn-retry').addEventListener('click', () => this.restartGame());
    this.gameOverScreen.querySelector('#btn-leaderboard-gameover').addEventListener('click', () => this.showLeaderboard('gameover'));
    this.gameOverScreen.querySelector('#btn-menu').addEventListener('click', () => this.quitToMenu());
  }

  // create leaderboard display screen
  createLeaderboardScreen() {
    this.leaderboardScreen = document.createElement('div');
    this.leaderboardScreen.className = 'ui-overlay pause-backdrop';
    this.leaderboardScreen.innerHTML = `
      <div class="ui-panel" style="width: 500px;">
        <h1 class="ui-title" style="font-size: 32px;">LEADERBOARD</h1>
        
        <div id="leaderboard-content"></div>
        
        <button class="ui-button" id="btn-leaderboard-back" style="margin-top: 20px;">BACK</button>
      </div>
    `;
    document.body.appendChild(this.leaderboardScreen);
    
    this.leaderboardScreen.querySelector('#btn-leaderboard-back').addEventListener('click', () => this.hideLeaderboard());
  }

  // create name input screen for high scores
  createNameInputScreen() {
    this.nameInputScreen = document.createElement('div');
    this.nameInputScreen.className = 'ui-overlay pause-backdrop';
    this.nameInputScreen.innerHTML = `
      <div class="ui-panel" style="width: 500px; text-align: center;">
        <div class="high-score-badge">NEW HIGH SCORE!</div>
        <h1 class="ui-title" style="font-size: 32px;">ENTER YOUR NAME</h1>
        
        <div class="stats-display">
          <div class="stat-box">
            <div class="stat-value" id="input-waves">0</div>
            <div class="stat-label">Waves</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" id="input-kills">0</div>
            <div class="stat-label">Kills</div>
          </div>
        </div>
        
        <p class="ui-subtitle">Your Score: <span id="input-score" style="color: #ff6600; font-weight: bold;">0</span></p>
        
        <div class="name-input-container">
          <input type="text" class="name-input" id="player-name-input" maxlength="12" placeholder="Your name...">
        </div>
        
        <button class="ui-button" id="btn-submit-score">SUBMIT SCORE</button>
        <button class="ui-button secondary" id="btn-skip-score">SKIP</button>
      </div>
    `;
    document.body.appendChild(this.nameInputScreen);
    
    this.nameInputScreen.querySelector('#btn-submit-score').addEventListener('click', () => this.submitScore());
    this.nameInputScreen.querySelector('#btn-skip-score').addEventListener('click', () => this.skipScoreSubmission());
    
    // allow enter to submit
    this.nameInputScreen.querySelector('#player-name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.submitScore();
      }
    });
  }

  // setup keyboard event listeners
  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!this.hasStarted) return;
        
        if (this.settingsMenu.classList.contains('visible')) {
          this.hideSettings();
        } else if (this.leaderboardScreen.classList.contains('visible')) {
          this.hideLeaderboard();
        } else if (this.isPaused && !this.nameInputScreen.classList.contains('visible')) {
          this.resumeGame();
        } else if (!this.isPaused) {
          this.pauseGame();
        }
      }
    });
  }

  // calculate score from waves and kills
  calculateScore(waves, kills) {
    return (waves * 100) + (kills * 10);
  }

  // check if score qualifes for leaderboard
  isHighScore(score) {
    if (this.leaderboard.length < this.maxLeaderboardEntries) return true;
    return score > this.leaderboard[this.leaderboard.length - 1].score;
  }

  // render leaderboard table html
  renderLeaderboardTable(highlightIndex = -1) {
    const content = this.leaderboardScreen.querySelector('#leaderboard-content');
    
    if (this.leaderboard.length === 0) {
      content.innerHTML = '<div class="leaderboard-empty">No scores yet. Be the first to play!</div>';
      return;
    }
    
    let html = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Waves</th>
            <th>Kills</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    this.leaderboard.forEach((entry, index) => {
      const rankClass = index < 3 ? `rank-${index + 1}` : '';
      const newClass = index === highlightIndex ? 'new-entry' : '';
      html += `
        <tr class="${newClass}">
          <td class="rank ${rankClass}">#${index + 1}</td>
          <td class="name">${this.escapeHtml(entry.name)}</td>
          <td>${entry.waves}</td>
          <td>${entry.kills}</td>
          <td class="score">${entry.score.toLocaleString()}</td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    content.innerHTML = html;
  }

  // escape html to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // start the game
  startGame() {
    this.hasStarted = true;
    this.titleScreen.classList.remove('visible');
    
    // request pointer lock to start
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.requestPointerLock();
    }
    
    // start music
    if (this.game.audioManager) {
      this.game.audioManager.startMusic();
    }
    
    // apply settings
    this.applyAudioSettings();
    this.applySensitivity();
  }

  // pause the game
  pauseGame() {
    if (!this.hasStarted || this.isPaused) return;
    
    this.isPaused = true;
    this.pauseMenu.classList.add('visible');
    
    // exit pointer lock
    document.exitPointerLock();
    
    // pause the game
    if (this.game) {
      this.game.stop();
    }
  }

  // resume game from pause
  resumeGame() {
    if (!this.isPaused) return;
    
    this.isPaused = false;
    this.pauseMenu.classList.remove('visible');
    this.settingsMenu.classList.remove('visible');
    
    // request pointer lock
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.requestPointerLock();
    }
    
    // resume the game
    if (this.game) {
      this.game.start();
    }
  }

  // show settings screen
  showSettings() {
    this.previousScreen = this.isPaused ? 'pause' : 'title';
    if (this.isPaused) {
      this.pauseMenu.classList.remove('visible');
    } else {
      this.titleScreen.classList.remove('visible');
    }
    this.settingsMenu.classList.add('visible');
  }

  // hide settings and return to previous screen
  hideSettings() {
    this.settingsMenu.classList.remove('visible');
    this.saveSettings();
    
    if (this.previousScreen === 'pause') {
      this.pauseMenu.classList.add('visible');
    } else if (!this.hasStarted) {
      this.titleScreen.classList.add('visible');
    }
  }

  // show leaderboard screen
  showLeaderboard(from) {
    this.leaderboardFrom = from;
    
    if (from === 'title') {
      this.titleScreen.classList.remove('visible');
    } else if (from === 'gameover') {
      this.gameOverScreen.classList.remove('visible');
    }
    
    this.renderLeaderboardTable();
    this.leaderboardScreen.classList.add('visible');
  }

  // hide leaderboard and return
  hideLeaderboard() {
    this.leaderboardScreen.classList.remove('visible');
    
    if (this.leaderboardFrom === 'title') {
      this.titleScreen.classList.add('visible');
    } else if (this.leaderboardFrom === 'gameover') {
      this.gameOverScreen.classList.add('visible');
    }
  }

  // show game over screen with final stats
  showGameOver(isVictory = false, waves = 0, kills = 0) {
    this.isPaused = true;
    this.lastWaves = waves;
    this.lastKills = kills;
    this.lastScore = this.calculateScore(waves, kills);
    
    const title = this.gameOverScreen.querySelector('#gameover-title');
    const subtitle = this.gameOverScreen.querySelector('#gameover-subtitle');
    
    if (isVictory) {
      title.textContent = 'VICTORY!';
      title.className = 'ui-title victory-title';
      subtitle.textContent = 'You successfully defended the portal';
    } else {
      title.textContent = 'GAME OVER';
      title.className = 'ui-title gameover-title';
      subtitle.textContent = 'The portal has been destroyed';
    }
    
    this.gameOverScreen.querySelector('#stat-waves').textContent = waves;
    this.gameOverScreen.querySelector('#stat-kills').textContent = kills;
    this.gameOverScreen.querySelector('#score-waves').textContent = (waves * 100).toLocaleString();
    this.gameOverScreen.querySelector('#score-kills').textContent = (kills * 10).toLocaleString();
    this.gameOverScreen.querySelector('#score-total').textContent = this.lastScore.toLocaleString();
    
    document.exitPointerLock();
    
    if (this.game) {
      this.game.stop();
    }
    
    // check if high score
    if (this.isHighScore(this.lastScore)) {
      this.showNameInput(waves, kills, this.lastScore);
    } else {
      this.gameOverScreen.classList.add('visible');
    }
  }

  // show name input for high score entry
  showNameInput(waves, kills, score) {
    this.nameInputScreen.querySelector('#input-waves').textContent = waves;
    this.nameInputScreen.querySelector('#input-kills').textContent = kills;
    this.nameInputScreen.querySelector('#input-score').textContent = score.toLocaleString();
    this.nameInputScreen.querySelector('#player-name-input').value = '';
    
    this.nameInputScreen.classList.add('visible');
    
    // focus input after animation
    setTimeout(() => {
      this.nameInputScreen.querySelector('#player-name-input').focus();
    }, 300);
  }

  // submit score to leaderboard
  submitScore() {
    const nameInput = this.nameInputScreen.querySelector('#player-name-input');
    let name = nameInput.value.trim();
    
    if (!name) {
      name = 'Anonymous';
    }
    
    // add to leaderboard
    const newEntry = {
      name: name,
      waves: this.lastWaves,
      kills: this.lastKills,
      score: this.lastScore,
      date: new Date().toISOString()
    };
    
    this.leaderboard.push(newEntry);
    this.leaderboard.sort((a, b) => b.score - a.score);
    
    // keep only top 10
    if (this.leaderboard.length > this.maxLeaderboardEntries) {
      this.leaderboard = this.leaderboard.slice(0, this.maxLeaderboardEntries);
    }
    
    // find index of new entry
    const newIndex = this.leaderboard.findIndex(e => e === newEntry);
    
    // save to localStorage
    this.saveLeaderboard();
    
    // hide name input and show leaderboard with highlight
    this.nameInputScreen.classList.remove('visible');
    this.leaderboardFrom = 'gameover';
    this.renderLeaderboardTable(newIndex);
    this.leaderboardScreen.classList.add('visible');
  }

  // skip score submission
  skipScoreSubmission() {
    this.nameInputScreen.classList.remove('visible');
    this.gameOverScreen.classList.add('visible');
  }

  // restart by reloading page
  restartGame() {
    window.location.reload();
  }

  // quit to main menu by reloading
  quitToMenu() {
    window.location.reload();
  }

  // apply audio volume settings
  applyAudioSettings() {
    if (!this.game || !this.game.audioManager) return;
    
    const audioManager = this.game.audioManager;
    
    // apply master volume
    audioManager.setMasterVolume(this.settings.masterVolume);
    
    // apply music volume
    if (audioManager.music) {
      audioManager.music.setVolume(0.08 * this.settings.musicVolume);
    }
    
    // save sfx volumes for new sounds
    const sfxMult = this.settings.sfxVolume;
    audioManager.volumes.zombie = 1.0 * sfxMult;
    audioManager.volumes.explosion = 1.0 * sfxMult;
    audioManager.volumes.portal = 0.8 * sfxMult;
    audioManager.volumes.shot = 0.5 * sfxMult;
    
    // update portal if exists
    if (audioManager.portalAudio) {
      audioManager.portalAudio.setVolume(audioManager.volumes.portal);
    }
  }

  // apply mouse sensitivity setting
  applySensitivity() {
    if (!this.game || !this.game.playerControls) return;
    
    this.game.playerControls.setSensitivity(this.settings.mouseSensitivity);
  }

  // save settings to local storage
  saveSettings() {
    localStorage.setItem('caveArenaSettings', JSON.stringify(this.settings));
  }

  // load settings from local storage
  loadSettings() {
    const saved = localStorage.getItem('caveArenaSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    }
  }

  // save leaderboard to local storage
  saveLeaderboard() {
    localStorage.setItem('caveArenaLeaderboard', JSON.stringify(this.leaderboard));
  }

  // load leaderboard from local storage
  loadLeaderboard() {
    const saved = localStorage.getItem('caveArenaLeaderboard');
    if (saved) {
      try {
        this.leaderboard = JSON.parse(saved);
        // ensure its sorted and limited
        this.leaderboard.sort((a, b) => b.score - a.score);
        this.leaderboard = this.leaderboard.slice(0, this.maxLeaderboardEntries);
      } catch (e) {
        console.warn('Failed to load leaderboard:', e);
        this.leaderboard = [];
      }
    }
  }

  // method for other systems to trigger game over
  triggerGameOver(isVictory, waves, kills) {
    this.showGameOver(isVictory, waves, kills);
  }
}
