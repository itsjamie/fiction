let secretWord;
let letterCounts;
let timer;
let timerDisplay;
let timeRemaining = 600; // 10 minutes in seconds
let guesses = 0;
let beforeHalf = true;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const formattedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds;
  return `${formattedMinutes}:${formattedSeconds}`;
}

function startTimer() {
  timer = setInterval(timerTick, 1000);
}

function timerTick() {
  timeRemaining--;
  timerDisplay.textContent = `${formatTime(timeRemaining)}`;
  if (timeRemaining <= 0 || guesses === 10) {
    pauseTimer();
    timerDisplay.textContent = 'Time for the final guess!';
    return;
  }
  if (guesses === 5 && beforeHalf) {
    pauseTimer();
    timeRemaining = 600; // Reset back to ten minutes for the second half
    timerDisplay.textContent = 'That\'s half time! Resume the timer when ready.';
    beforeHalf = false;
    return;
  }
}

function pauseTimer() {
  clearInterval(timer);
  timer = undefined;
}

function resumeTimer() {
  if (typeof timer !== 'undefined') { return };
  startTimer();
}

function setGameUI(state) {
  const game = document.getElementById('game');
  if (game.dataset.state === state) { return };
  game.textContent = '';
  let ui;
  switch (state) {
    case 'guess':
      ui = setupGrid();
      timerDisplay = document.createElement('div');
      timerDisplay.textContent = `${formatTime(timeRemaining)}`;
      ui.appendChild(timerDisplay);
      const pauseButton = document.createElement('button');
      pauseButton.textContent = 'Pause Timer';
      pauseButton.addEventListener('pointerdown', pauseTimer);
      const resumeButton = document.createElement('button');
      resumeButton.textContent = 'Resume Timer';
      resumeButton.addEventListener('pointerdown', resumeTimer);
      ui.appendChild(pauseButton);
      ui.appendChild(resumeButton);
      startTimer();
      break;
    default:
      ui = document.createElement('div');
      ui.textContent = 'Invalid state';
      break;
  }
  game.appendChild(ui);
}

document.addEventListener('DOMContentLoaded', initializeGame)

function initializeGame() {
  const setupForm = document.querySelector('#game form');
  if (!setupForm) { return; }
  setupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const wordInput = event.target.elements[0]
    wordInput.setCustomValidity('');
    wordInput.reportValidity(true);
    
    const valid = event.target.checkValidity();
    if (!valid) {
      return;
    }
    
    secretWord = wordInput.value.toLowerCase();
    letterCounts = new Map();
    const len = secretWord.length;
    for (let i = 0; i < len; i++) {
      const letter = secretWord[i];
      let count = letterCounts.get(letter) ?? 0;
      letterCounts.set(letter, count + 1);
    }
    
    setGameUI('guess');
  })
}

function handleRowKeyDown(event) {
  const input = event.target;
  const letterContainer = input.parentElement;
  const previousLetterContainer = letterContainer.previousElementSibling;
  const nextLetterContainer = letterContainer.nextElementSibling;
  switch (event.key) {
    case 'Backspace':
      if (input.value.length === 0 && previousLetterContainer) {
        const previousInput = previousLetterContainer.querySelector('input');
        previousInput.focus();
      }
      break;
    case 'Enter':
      if (input.value.length === input.maxLength) {
        const rowContainers = Array.from(input.parentElement.parentElement.querySelectorAll('.letter-container'));
        if (rowContainers.every((container) => container.querySelector('input').value.length === 1)) {
          const guess = rowContainers.map((container) => container.querySelector('input').value).join('');
          checkGuess(guess, rowContainers.map((container) => container.querySelector('input')));
        }
      }
      break;
    default:
      if (input.value.length === input.maxLength && nextLetterContainer) {
        const nextInput = nextLetterContainer.querySelector('input');
        nextInput.focus();
      }
      break;
  }
}

function handleRowPointerDown(event) {
  if (event.target.tagName !== 'INPUT') { return; } // if not an input
  if (typeof event.target.parentElement.dataset.status === 'undefined') { return; } // if not guessed yet
  event.preventDefault(); // prevent the text from getting selected
  const input = event.target;
  const row = input.parentElement.parentElement; // Get the row
  const otherInputs = Array.from(row.querySelectorAll('input')).filter(input => input === input);
  otherInputs.forEach((input) => {
    input.parentElement.classList.remove('lie-correct');
    input.parentElement.classList.remove('lie-close');
    input.parentElement.classList.remove('lie-wrong');
  });
  
  const letterContainer = input.parentElement;
  const currentClass = letterContainer.dataset.lie;
  const classes = ['correct', 'close', 'wrong'].filter((className) => className !== input.parentElement.dataset.status);
  const currentIndex = classes.indexOf(currentClass);
  const nextIndex = (currentIndex + 1) % classes.length;
  letterContainer.dataset.lie = classes[nextIndex];
  letterContainer.classList.remove('lie-'+currentClass);
  letterContainer.classList.add('lie-'+classes[nextIndex]);
}

function setupGrid() {
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (let i = 0; i < 10; i++) {
    const disabled = i !== 0;
    const row = document.createElement('div');
    row.className = 'row';
    row.addEventListener('keyup', handleRowKeyDown);
    row.addEventListener('pointerdown', handleRowPointerDown);
    for (let j = 0; j < 5; j++) {
      const letterContainer = document.createElement('div');
      letterContainer.className = 'letter-container';
      const guess = document.createElement('input');
      guess.type = 'text';
      guess.maxLength = 1;
      guess.className = 'letter';
      guess.disabled = disabled;
      letterContainer.appendChild(guess);
      row.appendChild(letterContainer);
    }
    grid.appendChild(row);
  }
  return grid;
}

function checkGuess(guess, inputs) {
  guess = guess.toLowerCase();
  guesses++;
  guessed = new Set();
  for (let i = 0; i < guess.length; i++) {
    const letter = guess[i];
    const input = inputs[i];
    const isCorrect = letter === secretWord[i];
    const isClose = !isCorrect && letterCounts.has(letter);
    const onlyOne = letterCounts.get(letter) == 1
    let status;
    if (isCorrect) {
      status = 'correct';
    } else if (isClose) {
      status = 'close';
      if (onlyOne){
        if (guessed.has(letter)) {
          status = 'wrong'
        } else {
          // Look ahead and see if there's any correct placements for this letter,
          // if there is, then they will take priority, so this will be an X
          for (let j = i + 1; j < guess.length; j++) {
            if (guess[j] === letter && letter === secretWord[j]) {
              status = 'wrong';
              break;
            }
          }
        }
      }
    } else {
      status = 'wrong';
    }
    input.parentElement.dataset.status = status;
    input.parentElement.classList.add(status);
    input.value = letter;
    input.disabled = true;
    guessed.add(letter);
  }

  const nextGuess = inputs[0].parentElement.parentElement.nextElementSibling;
  nextGuess.querySelectorAll('input').forEach(input => input.disabled = false);
}
