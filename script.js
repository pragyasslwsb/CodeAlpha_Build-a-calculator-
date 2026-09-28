// Keeps the current value as editable text so decimal entry stays predictable.
let currentInput = '0';
// Stores the first value while the user chooses the next operand.
let storedValue = null;
// Remembers the pending arithmetic operation, if one is selected.
let pendingOperator = null;
// Tracks whether the next digit should start a fresh number.
let replaceInput = false;
// Remembers the expression shown after a calculation is completed.
let completedExpression = '';
// Holds recent calculations for the History view.
let historyEntries = [];

// Collects the calculator elements used throughout the script.
const resultDisplay = document.querySelector('#result');
// Collects the expression line above the current value.
const expressionDisplay = document.querySelector('#expression');
// Collects the history list container.
const historyList = document.querySelector('#history-list');
// Collects the small number badge in the navigation.
const historyCount = document.querySelector('#history-count');
// Collects the button and icon used to switch the page appearance.
const themeToggle = document.querySelector('#theme-toggle');
// Collects the glyph that changes between the moon and sun states.
const themeIcon = document.querySelector('#theme-icon');

// Applies a theme and optionally remembers the choice for the next visit.
function applyTheme(theme, savePreference = true) {
  // Reduces the selected option to the two supported theme names.
  const selectedTheme = theme === 'dark' ? 'dark' : 'light';
  // Stores dark mode on the root element so CSS can update every surface.
  if (selectedTheme === 'dark') document.documentElement.dataset.theme = 'dark';
  // Removes the theme attribute to restore the default light palette.
  else delete document.documentElement.dataset.theme;
  // Keeps the toggle state clear to assistive technology.
  themeToggle.setAttribute('aria-pressed', String(selectedTheme === 'dark'));
  // Names the action the button will perform next.
  const actionLabel = selectedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  // Updates both the accessible label and pointer tooltip.
  themeToggle.setAttribute('aria-label', actionLabel);
  themeToggle.title = actionLabel;
  // Uses a simple sun or moon mark to reflect the active palette.
  themeIcon.textContent = selectedTheme === 'dark' ? '☀' : '☾';
  // Saves the choice when browser storage is available.
  if (savePreference) {
    try {
      window.localStorage.setItem('count-theme', selectedTheme);
    } catch {
      // The theme still works for this visit when storage is unavailable.
    }
  }
}

// Reads the last selected palette while safely handling restricted storage.
function getSavedTheme() {
  try {
    // Uses the saved choice or falls back to the original light appearance.
    return window.localStorage.getItem('count-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    // Uses the default palette when the browser blocks local storage access.
    return 'light';
  }
}

// Lets the user change themes without reloading the page.
themeToggle.addEventListener('click', () => {
  // Chooses the opposite of the currently active palette.
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  // Applies the new palette and saves it for later visits.
  applyTheme(nextTheme);
});

// Restores the preferred palette before rendering the calculator state.
applyTheme(getSavedTheme(), false);

// Converts numeric strings into clean display text without floating-point noise.
function formatNumber(value) {
  // Rounds arithmetic output to a practical precision for a basic calculator.
  const rounded = Number.parseFloat(value.toPrecision(12));
  // Uses locale grouping while avoiding unnecessary trailing zeroes.
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(rounded);
}

// Updates the two calculator display lines from the current state.
function renderDisplay() {
  // Shows a pending expression or a short prompt when no operation is active.
  expressionDisplay.textContent = pendingOperator
    ? `${formatNumber(storedValue)} ${displayOperator(pendingOperator)}`
    : completedExpression || 'Ready when you are';
  // Shows the current number in a readable, grouped format.
  resultDisplay.textContent = currentInput === 'Error' ? 'Error' : formatNumber(Number(currentInput));
}

// Maps programming symbols to the calculator's familiar typographic symbols.
function displayOperator(operator) {
  // Keeps the internal operators simple while presenting recognizable labels.
  return ({ '+': '+', '-': '−', '*': '×', '/': '÷' })[operator] || operator;
}

// Adds a digit to the current number or starts a new number after an operation.
function enterDigit(digit) {
  // Clears an error state before accepting fresh input.
  if (currentInput === 'Error') resetCalculator();
  // Starts a new operand when the previous action completed or chose an operator.
  if (replaceInput) {
    currentInput = digit;
    replaceInput = false;
  // Replaces the leading zero instead of creating confusing values like 07.
  } else if (currentInput === '0') {
    currentInput = digit;
  // Limits input length so the display remains useful on narrow devices.
  } else if (currentInput.replace('-', '').length < 14) {
    currentInput += digit;
  }
  // Removes an old answer label as soon as a new number is entered.
  completedExpression = '';
  // Refreshes the screen after the state changes.
  renderDisplay();
}

// Applies an operator immediately when a second operator is chosen in sequence.
function chooseOperator(operator) {
  // Ignores operator input while an error is displayed.
  if (currentInput === 'Error') return;
  // Completes the earlier operation before storing the next one.
  if (pendingOperator && !replaceInput) calculateResult();
  // Saves the displayed number as the first operand.
  storedValue = Number(currentInput);
  // Saves the operator for the next calculation action.
  pendingOperator = operator;
  // Tells digit entry to replace the current value with the next operand.
  replaceInput = true;
  // Clears a prior completed label when beginning a new expression.
  completedExpression = '';
  // Shows the newly selected operator.
  renderDisplay();
}

// Calculates a result from the stored first value and current second value.
function calculateResult() {
  // Leaves the value unchanged if no complete expression exists.
  if (!pendingOperator || storedValue === null || currentInput === 'Error') return;
  // Captures the second value before the display state changes.
  const secondValue = Number(currentInput);
  // Starts with a non-number sentinel so invalid cases are easy to detect.
  let answer = Number.NaN;
  // Selects the requested arithmetic operation.
  if (pendingOperator === '+') answer = storedValue + secondValue;
  // Handles subtraction using the same stored/current operand convention.
  if (pendingOperator === '-') answer = storedValue - secondValue;
  // Multiplies the two entered values.
  if (pendingOperator === '*') answer = storedValue * secondValue;
  // Prevents an undefined infinite result when dividing by zero.
  if (pendingOperator === '/' && secondValue !== 0) answer = storedValue / secondValue;
  // Captures the readable expression before clearing pending-operation state.
  const expression = `${formatNumber(storedValue)} ${displayOperator(pendingOperator)} ${formatNumber(secondValue)}`;
  // Handles division by zero and any non-finite result as a visible error.
  if (!Number.isFinite(answer)) {
    currentInput = 'Error';
    completedExpression = 'Cannot divide by zero';
  // Saves the result and expression when arithmetic succeeds.
  } else {
    currentInput = String(answer);
    completedExpression = `${expression} =`;
    addHistoryEntry(expression, answer);
  }
  // Clears the completed operation so the next calculation can begin cleanly.
  storedValue = null;
  // Clears the pending operator after success or error.
  pendingOperator = null;
  // Makes the next digit replace this result instead of appending to it.
  replaceInput = true;
  // Updates the screen and history badge.
  renderDisplay();
}

// Resets the calculator state to its initial value.
function resetCalculator() {
  // Restores the editable number to zero.
  currentInput = '0';
  // Removes any stored first operand.
  storedValue = null;
  // Cancels an operation that has not yet been completed.
  pendingOperator = null;
  // Lets the next digit replace the zero.
  replaceInput = false;
  // Removes any prior expression from the display.
  completedExpression = '';
  // Renders the reset state immediately.
  renderDisplay();
}

// Changes the current number's sign without changing the pending operation.
function toggleSign() {
  // Does not modify an error message as though it were a number.
  if (currentInput === 'Error' || Number(currentInput) === 0) return;
  // Toggles a leading minus sign on the current operand.
  currentInput = currentInput.startsWith('-') ? currentInput.slice(1) : `-${currentInput}`;
  // Refreshes the visible number after the sign change.
  renderDisplay();
}

// Converts the current number to its percentage value.
function convertPercent() {
  // Avoids trying to transform the visible error label.
  if (currentInput === 'Error') return;
  // Treats the percent key as division by one hundred.
  currentInput = String(Number(currentInput) / 100);
  // Updates the display with the percentage value.
  renderDisplay();
}

// Removes one character from the current number for keyboard or button input.
function deleteLastDigit() {
  // Ignores deletion when the current display is an error or an operation awaits input.
  if (currentInput === 'Error' || replaceInput) return;
  // Removes the final character, restoring zero when no digits remain.
  currentInput = currentInput.length <= 1 || (currentInput.length === 2 && currentInput.startsWith('-'))
    ? '0'
    : currentInput.slice(0, -1);
  // Keeps the display in sync with the edited value.
  renderDisplay();
}

// Restores valid, recent calculations from browser storage when available.
function loadHistoryEntries() {
  try {
    // Reads the serialized history without assuming the data is well formed.
    const savedEntries = JSON.parse(window.localStorage.getItem('count-history') || '[]');
    // Rejects invalid storage shapes instead of breaking calculator startup.
    if (!Array.isArray(savedEntries)) return [];
    // Validates saved fields and converts timestamps back into Date objects.
    return savedEntries
      .filter((entry) => entry && typeof entry.expression === 'string' && typeof entry.answer === 'string'
        && typeof entry.time === 'string' && Number.isFinite(Number(entry.answer)) && Number.isFinite(Date.parse(entry.time)))
      .slice(0, 20)
      .map((entry) => ({ expression: entry.expression, answer: entry.answer, time: new Date(entry.time) }));
  } catch {
    // Starts with an empty history if storage is disabled or corrupted.
    return [];
  }
}

// Saves the current recent calculations while tolerating restricted storage.
function saveHistoryEntries() {
  try {
    // Stores only the fields required to rebuild each history row.
    const savedEntries = historyEntries.map(({ expression, answer, time }) => ({
      expression,
      answer,
      time: time.toISOString(),
    }));
    // Persists the newest calculations for the next visit.
    window.localStorage.setItem('count-history', JSON.stringify(savedEntries));
  } catch {
    // Keeps the current session usable if the browser blocks storage writes.
  }
}

// Adds a successful calculation to the top of the recent-history list.
function addHistoryEntry(expression, answer) {
  // Stores the expression, raw answer, and time for later selection.
  historyEntries.unshift({ expression, answer: String(answer), time: new Date() });
  // Limits the list to the latest twenty calculations.
  historyEntries = historyEntries.slice(0, 20);
  // Keeps the saved history in sync with the visible list.
  saveHistoryEntries();
  // Refreshes the history rows and navigation count.
  renderHistory();
}

// Formats a time label that stays compact in the history list.
function formatTime(date) {
  // Returns a localized hour and minute for the completed calculation.
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

// Renders history entries as buttons that can restore a previous answer.
function renderHistory() {
  // Updates the navigation badge to match the current number of saved rows.
  historyCount.textContent = String(historyEntries.length);
  // Shows a brief empty message before the first calculation is completed.
  if (historyEntries.length === 0) {
    historyList.innerHTML = '<p class="history-empty">Your calculations will show up here.</p>';
    return;
  }
  // Builds each row with DOM nodes so the labels remain safely escaped.
  historyList.replaceChildren(...historyEntries.map((entry, index) => {
    // Creates an accessible button for recalling this saved answer.
    const row = document.createElement('button');
    // Applies the shared history row styling.
    row.className = 'history-item';
    // Exposes the entry index to the shared click handler.
    row.dataset.historyIndex = String(index);
    // Describes the action to assistive technology.
    row.setAttribute('aria-label', `${entry.expression} equals ${formatNumber(Number(entry.answer))}. Use result.`);
    // Adds the expression and saved time to the left side of the row.
    const details = document.createElement('span');
    // Applies the history detail layout class.
    details.className = 'history-details';
    // Creates the expression label without injecting user-controlled markup.
    const expression = document.createElement('span');
    // Styles the expression label.
    expression.className = 'history-expression';
    // Converts programming operator characters to familiar display symbols.
    expression.textContent = entry.expression.replaceAll('*', '×').replaceAll('/', '÷').replaceAll('-', '−');
    // Creates the calculation time label.
    const time = document.createElement('span');
    // Styles the timestamp label.
    time.className = 'history-time';
    // Displays the localized calculation time.
    time.textContent = formatTime(entry.time);
    // Groups the expression and time together on the left side.
    details.append(expression, time);
    // Creates the result text on the right side of the row.
    const answer = document.createElement('span');
    // Styles the saved answer for quick scanning.
    answer.className = 'history-answer';
    // Displays a formatted version of the saved result.
    answer.textContent = formatNumber(Number(entry.answer));
    // Puts details and answer in the clickable row.
    row.append(details, answer);
    // Returns the finished row for insertion into the list.
    return row;
  }));
}

// Switches between calculator and history without a page reload.
function showView(viewName) {
  // Determines which panel should be visible from the requested view name.
  const showHistory = viewName === 'history';
  // Looks up the two main view panels.
  const calculatorView = document.querySelector('#calculator-view');
  // Looks up the history panel.
  const historyView = document.querySelector('#history-view');
  // Shows only the requested view panel.
  calculatorView.hidden = showHistory;
  // Shows history only when its navigation option is chosen.
  historyView.hidden = !showHistory;
  // Applies active styles and accessible current-page state to navigation buttons.
  document.querySelectorAll('.nav-button').forEach((button) => {
    // Compares this button's view with the selected view.
    const isCurrent = button.dataset.view === viewName;
    // Toggles the visual active state.
    button.classList.toggle('is-active', isCurrent);
    // Marks the current destination for assistive technology.
    if (isCurrent) button.setAttribute('aria-current', 'page');
    // Removes the current-page marker from inactive destinations.
    else button.removeAttribute('aria-current');
  });
  // Updates the URL fragment so the selected view can be bookmarked.
  history.replaceState(null, '', showHistory ? '#history' : '#calculator');
}

// Routes keypad clicks to digit, operator, or utility behavior.
document.querySelector('.keypad').addEventListener('click', (event) => {
  // Finds the nearest calculator key, including clicks on nested content.
  const key = event.target.closest('button');
  // Ignores clicks that did not originate from a calculator button.
  if (!key) return;
  // Adds a pressed animation class for keyboard and pointer feedback.
  key.classList.add('is-pressed');
  // Removes the temporary press state after the transition has played.
  window.setTimeout(() => key.classList.remove('is-pressed'), 120);
  // Routes number buttons to number entry.
  if (key.dataset.digit !== undefined) enterDigit(key.dataset.digit);
  // Routes arithmetic buttons to operator selection.
  else if (key.dataset.operator) chooseOperator(key.dataset.operator);
  // Routes utility buttons to their matching calculator action.
  else if (key.dataset.action === 'clear') resetCalculator();
  // Computes the current expression when equals is pressed.
  else if (key.dataset.action === 'equals') calculateResult();
  // Toggles the sign of the current number.
  else if (key.dataset.action === 'sign') toggleSign();
  // Converts the current number to a percentage.
  else if (key.dataset.action === 'percent') convertPercent();
  // Enters a decimal point only once per number.
  else if (key.dataset.action === 'decimal' && !currentInput.includes('.')) {
    // Starts a fractional value with a leading zero when needed.
    currentInput = replaceInput ? '0.' : `${currentInput}.`;
    // Keeps the next digit attached to the decimal value.
    replaceInput = false;
    // Refreshes the displayed decimal input.
    renderDisplay();
  // Deletes the final digit when the delete key is pressed.
  } else if (key.dataset.action === 'delete') deleteLastDigit();
});

// Allows number entry and operations from the physical keyboard.
document.addEventListener('keydown', (event) => {
  // Prevents browser shortcuts from hijacking calculator input keys.
  if (/^[0-9.]$/.test(event.key) || ['+', '-', '*', '/', 'Enter', '=', 'Backspace', 'Escape', '%'].includes(event.key)) event.preventDefault();
  // Sends numeric keyboard keys to the same digit handler as the keypad.
  if (/^[0-9]$/.test(event.key)) enterDigit(event.key);
  // Sends arithmetic keyboard keys to the operator handler.
  else if (['+', '-', '*', '/'].includes(event.key)) chooseOperator(event.key);
  // Supports Enter and equals for calculation.
  else if (event.key === 'Enter' || event.key === '=') calculateResult();
  // Supports Backspace for deletion.
  else if (event.key === 'Backspace') deleteLastDigit();
  // Supports Escape for clear all.
  else if (event.key === 'Escape') resetCalculator();
  // Supports percent from the keyboard.
  else if (event.key === '%') convertPercent();
  // Supports a decimal point from the keyboard when one is not already present.
  else if (event.key === '.' && !currentInput.includes('.')) {
    // Starts a fractional value with a leading zero when needed.
    currentInput = replaceInput ? '0.' : `${currentInput}.`;
    // Makes subsequent digits append to the decimal number.
    replaceInput = false;
    // Renders the changed value.
    renderDisplay();
  }
});

// Connects the navigation buttons to the view-switching behavior.
document.querySelectorAll('.nav-button').forEach((button) => {
  // Switches to the view named on the clicked navigation button.
  button.addEventListener('click', () => showView(button.dataset.view));
});

// Lets users load a saved answer back into the calculator display.
historyList.addEventListener('click', (event) => {
  // Finds the selected history row even when its text was clicked.
  const row = event.target.closest('[data-history-index]');
  // Ignores clicks on the empty-state message.
  if (!row) return;
  // Retrieves the selected history record using its stored index.
  const entry = historyEntries[Number(row.dataset.historyIndex)];
  // Restores the saved answer as the current calculator value.
  currentInput = entry.answer;
  // Clears any previous pending operation.
  storedValue = null;
  // Clears any operator from the last expression.
  pendingOperator = null;
  // Makes the next digit start a new number.
  replaceInput = true;
  // Displays which history item was recalled.
  completedExpression = `${entry.expression} =`;
  // Returns the user to the calculator view with the selected result.
  showView('calculator');
  // Refreshes the calculator display.
  renderDisplay();
});

// Clears all saved rows from the History view.
document.querySelector('#clear-history').addEventListener('click', () => {
  // Removes all calculations from the in-memory history list.
  historyEntries = [];
  // Removes the saved calculations as well as the visible rows.
  saveHistoryEntries();
  // Shows the empty state and resets the navigation count.
  renderHistory();
});

// Loads saved calculations before rendering the initial History state.
historyEntries = loadHistoryEntries();
// Opens the correct view if the page was loaded with a known URL fragment.
if (window.location.hash === '#history') showView('history');
// Draws the initial calculator and empty-history states.
renderDisplay();
// Ensures the history badge starts at zero.
renderHistory();