const { ipcRenderer } = require('electron')

// let displayDay = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
let displayDay = ["일", "월", "화", "수", "목", "금", "토"];
let displayDayColor = ["text-danger", "", "", "", "", "", "text-primary"];

// ----------------------------------------------------------------------------

window.addEventListener('load', function () {
  setInterval(getTime, 1000);
})

let getTime = function() {
  let date = new Date();
  document.getElementById("time-value").innerHTML = date.toLocaleTimeString();
}

ipcRenderer.on('owKey', function (event, arg) {
  getWeather(JSON.parse(arg).owKey, "daegu");
});

ipcRenderer.on('holiday', function (event, arg) {
  let holidays = JSON.parse(arg);
  console.log(holidays);

  let cal_date = document.getElementsByClassName("cal-btn");
  $(".cal-btn").each(function(i, c){
    let badge_month = '<span class="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-success badge-month">' + c.dataset.month + '월' + '</span>';
    let badge_holiday = '<span class="position-absolute top-100 start-100 translate-middle badge rounded-pill bg-dark badge-holiday">휴관</span>';

    // if(i == 0) $(c).addClass("position-relative").append(badge_month);
    if(c.dataset.date == 1) $(c).addClass("position-relative").append(badge_month);
    
    for(let h of holidays) {
      if(c.dataset.year == h.YEAR && c.dataset.month == h.MONTH) {
        let days = h.DAYS.split(",");
        days.sort(function(a, b){return a - b}).find(function(day){
          if(day.trim() == c.dataset.date) {
            // $(c).removeClass("bg-warning").addClass("bg-danger position-relative").append(badge_holiday);
            $(c).removeClass("bg-warning").addClass("bg-danger position-relative");
          }
        });
      }
    }
  });
});

ipcRenderer.on('return_plan_date', function (event, arg) {
  let return_plan_date = JSON.parse(arg);

  console.log(return_plan_date);

  // document.getElementById("year-return").innerHTML = return_plan_date.year;
  document.getElementById("day-return").innerHTML = displayDay[return_plan_date.day];
  document.getElementById("month-return").innerHTML = return_plan_date.month.toString().padStart(2,0);
  document.getElementById("date-return").innerHTML = return_plan_date.date.toString().padStart(2,0);
  document.getElementById("loan_period-value").innerHTML = return_plan_date.loan_period;

  let date = new Date();
  yyyy = date.getFullYear();
  mm = date.getMonth() + 1;
  dd = date.getDate();
  day = date.getDay();

  document.getElementById("day-loan").innerHTML = displayDay[date.getDay()];
  document.getElementById("month-loan").innerHTML = (date.getMonth() + 1).toString().padStart(2,0);
  document.getElementById("date-loan").innerHTML = date.getDate().toString().padStart(2,0);

  let elem = [];

  // prefix
  if(day != 0) {
    for(let i=day-1; i>=0; i--) {
      let attr = "";
      
      date.setDate(date.getDate() - 1);

      if(date.getMonth()+1 != mm) attr = " disabled";
      
      elem.unshift('<div class="cal-btn" data-year="'+ date.getFullYear() +'" data-month="'+ (date.getMonth()+1) +'" data-date="'+ date.getDate() +'"' + attr +'>'+ date.getDate() +'</div>');
    }
  }

  // loan_period
  date = new Date();
  date.setDate(date.getDate() - 1);

  let dateForCompare = return_plan_date.date;

  if(return_plan_date.month != mm) for(let i=mm; i<return_plan_date.month; i++) dateForCompare = new Date(2021, mm, 0).getDate() + return_plan_date.date;

  for(let i=dd; i<=dateForCompare; i++) {
    date.setDate(date.getDate() + 1);

    elem.push('<div class="cal-btn bg-warning" data-year="'+ date.getFullYear() +'" data-month="'+ (date.getMonth()+1) +'" data-date="'+ date.getDate() +'">'+ date.getDate() +'</div>');
  }

  // suffix - 1 (Complete week)
  if(return_plan_date.day != 6) {
    for(let i=return_plan_date.day+1; i<=6; i++) {
      let attr = "";

      date.setDate(date.getDate() + 1);

      if(date.getMonth()+1 != return_plan_date.month) attr = " disabled";
      
      elem.push('<div class="cal-btn" data-year="'+ date.getFullYear() +'" data-month="'+ (date.getMonth()+1) +'" data-date="'+ date.getDate() +'"' + attr +'>'+ date.getDate() +'</div>');
    }
  }

  // suffix - 2 (Complete month)
  for(let i=elem.length; i<28; i++) {
    let attr = "";

    date.setDate(date.getDate() + 1);

    if(date.getMonth()+1 != return_plan_date.month) attr = " disabled";
    
    elem.push('<div class="cal-btn" data-year="'+ date.getFullYear() +'" data-month="'+ (date.getMonth()+1) +'" data-date="'+ date.getDate() +'"' + attr +'>'+ date.getDate() +'</div>');
  }

  let markup = '';
  for(let item of elem) markup += item;

  document.getElementById("cal_date_area").innerHTML = markup;
});

let getWeather = function(owKey, city_name) {
  let el = "";
  fetch("https://api.openweathermap.org/data/2.5/weather?lang=kr&units=metric&appid="+ owKey +"&q=" + city_name)
    .then((response) => response.json())
    .then((data) => {
      el += '<div class="col-md-4 col-lg-3"><img src="http://openweathermap.org/img/wn/' + data.weather[0].icon + '@2x.png"></div>';
      el += '<div class="col-md-8 col-lg-9 pt-4"><ul class="list-unstyled"><li><h5 class="text-truncate">' + data.weather[0].description + '</h5></li>';
      el += '<li><h5>' + data.main.temp.toFixed(0) + "°</h5></li></ul></div>";
      document.getElementById("weatherCurrent").innerHTML = el;
    });

  let el2 = "";
  fetch("https://api.openweathermap.org/data/2.5/forecast?cnt=6&units=metric&appid="+ owKey +"&q=" + city_name)
    .then((response) => response.json())
    .then((data) => {

      let i = 0;
      for(let item of data.list) {
        let col = "";
        if(i >= 3) col = "d-none d-lg-block";
        el2 += '<div class="col-md-4 col-lg-2 '+ col +'"><ul class="list-unstyled text-center"><li>' + new Date(item.dt * 1000).getHours() + '시</li>';
        el2 += '<li><img src="http://openweathermap.org/img/wn/'+ item.weather[0].icon +'.png"></li>';
        el2 += '<li><b>' + item.main.temp.toFixed(0) + '°</b></li></ul></div>';
        i++;
      }
      document.getElementById("weatherForecast").innerHTML = el2;
    });
}