const { ipcRenderer } = require('electron')

let displayDay = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

// ----------------------------------------------------------------------------

window.addEventListener('load', function () {
  setInterval(getTime, 1000);
})

let getToday = function() {
  let date = new Date();
  document.getElementById("year-loan").innerHTML = date.getFullYear();
  document.getElementById("day-loan").innerHTML = displayDay[date.getDay()];
  document.getElementById("month-loan").innerHTML = (date.getMonth() + 1).toString().padStart(2,0);
  document.getElementById("date-loan").innerHTML = date.getDate().toString().padStart(2,0);
}

let getTime = function() {
  let date = new Date();
  document.getElementById("time-value").innerHTML = date.toLocaleTimeString();
}

ipcRenderer.on('return_plan_date', function (event, arg) {
  let return_plan_date = JSON.parse(arg);

  document.getElementById("year-return").innerHTML = return_plan_date.year;
  document.getElementById("day-return").innerHTML = displayDay[return_plan_date.day];
  document.getElementById("month-return").innerHTML = return_plan_date.month.toString().padStart(2,0);
  document.getElementById("date-return").innerHTML = return_plan_date.date.toString().padStart(2,0);
  document.getElementById("loan_period-value").innerHTML = return_plan_date.loan_period;

  getToday();
});
