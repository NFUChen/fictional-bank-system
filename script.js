'use strict';
function refreshInfo(account) {
  function displayMovements({ movements }) {
    containerMovements.innerHTML = ''; // override existing html
    for (const [idx, movement] of movements.entries()) {
      const type = movement > 0 ? 'deposit' : 'withdrawal';
      const html = `
      <div class="movements__row">
        <div class="movements__type movements__type--${type}">${
        idx + 1
      } ${type}</div>
          <div class="movements__value">${movement.toFixed(2)} €</div>
      </div>
    `;

      containerMovements.insertAdjacentHTML('afterbegin', html);
    }
  }
  displayMovements(account);

  labelBalance.textContent = account.balance + ' €';
  labelSumIn.textContent = account.income + ' €';
  labelSumOut.textContent = account.expense + ' €';
  labelSumInterest.textContent = account.interest + ' €';

  labelWelcome.textContent = `Welcome back, ${account.owner.split(' ')[0]}`;
  inputLoanAmount.value = '';

  function getFormatedDate() {
    const now = new Date();
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const day = String(now.getDay()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    return `${year}/${month}/${day}  ${hour}:${minutes}:${seconds}`;
  }
  labelDate.textContent = getFormatedDate();
  containerApp.style.opacity = 1;
}

class Time {
  static loginTimer(number_of_minutes, system) {
    let remainingTime = number_of_minutes * 60;

    const countDownTimer = setInterval(function updateClock() {
      let minutes = String(Math.floor(remainingTime / 60)).padStart(2, '0');
      let seconds = String(remainingTime % 60).padStart(2, '0');
      labelTimer.textContent = `${minutes}:${seconds}`;
      remainingTime -= 1;

      if (remainingTime < 0) {
        clearInterval(countDownTimer);
        system.logout();
      }
    }, 1000);
    return countDownTimer;
  }
}

// BANKIST APP
class Calculator {
  static calcBalance(movements) {
    const totalBalance = this.getSum(movements);
    return totalBalance;
  }
  static calcIncome(movements) {
    const posMovement = movements.filter(movement => movement > 0);
    const totalIncome = this.getSum(posMovement);
    return totalIncome;
  }
  static calcExpense(movements) {
    const negMovement = movements.filter(movement => movement < 0);
    const totalExpense = this.getSum(negMovement);
    return Math.abs(totalExpense);
  }
  static calcInterest(movements, i) {
    const posMovementWithInterest = movements
      .filter(movement => movement > 0)
      .map(movement => (movement * i) / 100);

    const totalInterest =
      Math.round(this.getSum(posMovementWithInterest) * 100) / 100; // num.toFixed(2) -> String
    return totalInterest;
  }

  static getSum(array) {
    let _sum = 0;
    for (const element of array) {
      _sum += element;
    }
    return _sum;
  }
}

class Account {
  constructor(owner, movements, interestRate, pin) {
    this.owner = owner;
    this.movements = movements;
    this.interestRate = interestRate;
    this.pin = pin;
    this.ownerAbbr = this.owner
      .split(' ')
      .map(name => name[0].toLowerCase())
      .join('');
  }
  get balance() {
    return Calculator.calcBalance(this.movements);
  }

  get income() {
    return Calculator.calcIncome(this.movements);
  }
  get expense() {
    return Calculator.calcExpense(this.movements);
  }

  get interest() {
    return Calculator.calcInterest(this.movements, this.interestRate);
  }
}

class BankSystem {
  constructor(accounts) {
    this.accounts = accounts;
    this.currentLoginUser = null;
    this.timer = false;

    this._isTransferSucessful = true;
    this._isCloseAccountSucessful = true;
    this._isLoanRequestAccepted = true;
  }
  resetTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = Time.loginTimer(5, this);
  }

  loan(loanAmount) {
    loanAmount = Number(loanAmount);
    if (!this.canLoan(loanAmount)) {
      alert('Loan request denied');
      return;
    }
    this.currentLoginUser.movements.push(loanAmount);
    return this._isLoanRequestAccepted;
  }

  canLoan(loanAmount) {
    const isNotloanAmountGreaterThan0 = loanAmount <= 0;
    if (isNotloanAmountGreaterThan0) {
      return;
    }

    const pertmitThreshold = loanAmount * 0.1;
    const isNotAbovePermitThreshold = this.currentLoginUser.movements.every(
      movement => movement <= pertmitThreshold
    );
    if (isNotAbovePermitThreshold) {
      return;
    }

    return true;
  }

  closeAccount(closerAbbr, inputPin) {
    if (!this.canCloseAccount(closerAbbr, inputPin)) {
      alert('Can not close target account');
      return;
    }
    const closerIdx = this.getUserIndex(closerAbbr);
    this.accounts.splice(closerIdx, 1);
    return this._isCloseAccountSucessful;
  }

  canCloseAccount(closerAbbr, inputPin) {
    const isNotSelf = this.currentLoginUser.ownerAbbr !== closerAbbr;
    if (isNotSelf) {
      return;
    }
    const isNotMatchPin =
      String(this.currentLoginUser.pin) !== String(inputPin);
    if (isNotMatchPin) {
      return;
    }
    return true;
  }

  transfer(receiverAbbr, amount) {
    if (!this.canTransfer(receiverAbbr, amount)) {
      alert('Can not transferred to target account');
      return;
    }
    this.currentLoginUser.movements.push(-amount);
    const receiverAccount = this.getUser(receiverAbbr);
    receiverAccount.movements.push(amount);
    alert(
      `${this.currentLoginUser.owner} has transferred ${amount} to ${receiverAccount.owner}`
    );
    return this._isTransferSucessful;
  }
  canTransfer(receiverAbbr, amount) {
    const isNotAmountGreaterThan0 = amount <= 0;
    if (isNotAmountGreaterThan0) {
      return;
    }
    const isNotEnoughMoney = amount > this.currentLoginUser.balance;
    if (isNotEnoughMoney) {
      return;
    }

    const isNotValidUser = !this.isValidUser(receiverAbbr);
    if (isNotValidUser) {
      return;
    }
    const isSelfAccount = receiverAbbr === this.currentLoginUser.ownerAbbr;
    if (isSelfAccount) {
      return;
    }
    return true;
  }

  login(inputUserNameAbbr, inputPin) {
    if (!this.canLogin(inputUserNameAbbr, inputPin)) {
      alert('Can not login, incorrect user name or pin');
      return;
    }

    const loginAccount = this.getUser(inputUserNameAbbr);
    this.currentLoginUser = loginAccount;

    return loginAccount;
  }

  logout() {
    containerApp.style.opacity = 0;
    labelWelcome.textContent = 'Log in to get started';
  }

  canLogin(inputUserNameAbbr, inputPin) {
    const isValidUser = this.isValidUser(inputUserNameAbbr);
    if (!isValidUser) {
      return;
    }
    const targetUser = this.getUser(inputUserNameAbbr);
    const matchPin = String(targetUser?.pin) === String(inputPin);
    if (!matchPin) {
      return;
    }
    return true;
  }

  isValidUser(inputUserNameAbbr) {
    const targetUser = this.getUser(inputUserNameAbbr);
    return targetUser ? true : false;
  }

  getUser(inputUserNameAbbr) {
    const targetUser = this.accounts.find(
      account => account.ownerAbbr === inputUserNameAbbr
    );
    return targetUser;
  }
  getUserIndex(inputUserNameAbbr) {
    for (const [idx, account] of this.accounts.entries()) {
      if (account.ownerAbbr === inputUserNameAbbr) return idx;
    }
  }
  updateUI() {
    refreshInfo(this.currentLoginUser);
  }
}
// Data
const account1 = new Account(
  'William Chen',
  [200, 450, -400, 3000, -650, -130, 70, 1300],
  1.2,
  1111
);

const account2 = new Account(
  'Jessica Davis',
  [5000, 3400, -150, -790, -3210, -1000, 8500, -30],
  1.5,
  2222
);
const account3 = new Account(
  'Steven Thomas Williams',
  [200, -200, 340, -300, -20, 50, 400, -460],
  0.7,
  3333
);
const account4 = new Account('Sarah Smith', [430, 1000, 700, 50, 90], 1, 4444);

const accounts = [account1, account2, account3, account4];

// Elements
const labelWelcome = document.querySelector('.welcome');
const labelDate = document.querySelector('.date');
const labelBalance = document.querySelector('.balance__value');
const labelSumIn = document.querySelector('.summary__value--in');
const labelSumOut = document.querySelector('.summary__value--out');
const labelSumInterest = document.querySelector('.summary__value--interest');
const labelTimer = document.querySelector('.timer');

const containerApp = document.querySelector('.app');
const containerMovements = document.querySelector('.movements');

const btnLogin = document.querySelector('.login__btn');
const btnTransfer = document.querySelector('.form__btn--transfer');
const btnLoan = document.querySelector('.form__btn--loan');
const btnClose = document.querySelector('.form__btn--close');
const btnSort = document.querySelector('.btn--sort');

const inputLoginUsername = document.querySelector('.login__input--user');
const inputLoginPin = document.querySelector('.login__input--pin');
const inputTransferTo = document.querySelector('.form__input--to');
const inputTransferAmount = document.querySelector('.form__input--amount');
const inputLoanAmount = document.querySelector('.form__input--loan-amount');
const inputCloseUsername = document.querySelector('.form__input--user');
const inputClosePin = document.querySelector('.form__input--pin');

const bank = new BankSystem(accounts);

btnLogin.addEventListener('click', function (event) {
  // prevent form from usbmitting, since the login button is in a form,
  //the default behaviour is to subit the form
  event.preventDefault();

  const inputUserAbbr = inputLoginUsername.value;
  const inputPin = inputLoginPin.value;
  const loginAccount = bank.login(inputUserAbbr, inputPin);

  if (!loginAccount) {
    return;
  }
  bank.updateUI();
  bank.resetTimer();
});

btnTransfer.addEventListener('click', function (event) {
  event.preventDefault();
  const inputReceiverAbbr = inputTransferTo.value;
  const amount = Number(inputTransferAmount.value);

  const isTransferSucessful = bank.transfer(inputReceiverAbbr, amount);
  if (!isTransferSucessful) {
    return;
  }
  bank.updateUI();
  bank.resetTimer();
});

btnClose.addEventListener('click', function (event) {
  event.preventDefault();
  const inputCloserAbbr = inputCloseUsername.value;
  const inputPin = inputClosePin.value;
  const isCloseAccountSucessful = bank.closeAccount(inputCloserAbbr, inputPin);
  if (!isCloseAccountSucessful) {
    return;
  }
  containerApp.style.opacity = 0;
});

btnLoan.addEventListener('click', function (event) {
  event.preventDefault();
  const loanAmount = inputLoanAmount.value;
  const isLoanRequestAccepted = bank.loan(loanAmount);
  if (!isLoanRequestAccepted) {
    inputLoanAmount.value = '';
    return;
  }
  bank.updateUI();
  bank.resetTimer();
});
