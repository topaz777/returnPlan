const { ipcRenderer } = require('electron')

// let displayDay = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
let displayDay = ["일", "월", "화", "수", "목", "금", "토"];
let displayDayColor = ["text-danger", "", "", "", "", "", "text-primary"];

// ----------------------------------------------------------------------------

window.addEventListener('load', function () {
  setInterval(getTime, 1000);

  let elem = '';
  for(let i=0; i<28; i++) {
    elem += '<div class="cal-btn">'+ (i+1) +'</div>';
  }
  document.getElementById("cal_date_area").innerHTML = elem;
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

  document.getElementById("year-return").innerHTML = return_plan_date.year;
  document.getElementById("day-return").innerHTML = displayDay[return_plan_date.day];
  document.getElementById("month-return").innerHTML = return_plan_date.month.toString().padStart(2,0);
  document.getElementById("date-return").innerHTML = return_plan_date.date.toString().padStart(2,0);
  // document.getElementById("loan_period-value").innerHTML = return_plan_date.loan_period;

  let date = new Date();
  yyyy = date.getFullYear();
  mm = date.getMonth() + 1;
  dd = date.getDate();
  day = date.getDay();

  document.getElementById("year-loan").innerHTML = yyyy;
  document.getElementById("day-loan").innerHTML = displayDay[day];
  document.getElementById("month-loan").innerHTML = mm.toString().padStart(2,0);
  document.getElementById("date-loan").innerHTML = dd.toString().padStart(2,0);

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
  // let el = "";
  // fetch("https://api.openweathermap.org/data/2.5/weather?lang=kr&units=metric&appid="+ owKey +"&q=" + city_name)
  //   .then((response) => response.json())
  //   .then((data) => {
  //     el += '<div class="col-md-4 col-lg-3"><img src="http://openweathermap.org/img/wn/' + data.weather[0].icon + '@2x.png"></div>';
  //     el += '<div class="col-md-8 col-lg-9 pt-4"><ul class="list-unstyled"><li><h5 class="text-truncate">' + data.weather[0].description + '</h5></li>';
  //     el += '<li><h5>' + data.main.temp.toFixed(0) + "°</h5></li></ul></div>";
  //     document.getElementById("weatherCurrent").innerHTML = el;
  //   });

  let el2 = "";
  fetch("https://api.openweathermap.org/data/2.5/forecast?cnt=6&units=metric&appid="+ owKey +"&q=" + city_name)
    .then((response) => response.json())
    .then((data) => {

      let i = 0;
      for(let item of data.list) {
        let col = "";
        if(i >= 3) col = "d-none d-lg-block";
        el2 += '<div class="col-md-4 col-lg-2 '+ col +'"><ul class="list-unstyled text-center mb-0"><li>' + new Date(item.dt * 1000).getHours() + '시</li>';
        el2 += '<li><img src="http://openweathermap.org/img/wn/'+ item.weather[0].icon +'.png"></li>';
        el2 += '<li><b>' + item.main.temp.toFixed(0) + '°</b></li></ul></div>';
        i++;
      }
      document.getElementById("weatherForecast").innerHTML = el2;
    });
}

ipcRenderer.on('getLoanBest', function (event, arg) {
  let loanBest = JSON.parse(arg);
  let bestElem = '';

  console.log(loanBest);

  for(let i in loanBest) {
    loanBest[i].text_color = loanBest[i].working_status == "BOL112N" ? "bg-success" : "bg-danger";
    loanBest[i].working_status = loanBest[i].working_status == "BOL112N" ? "대출가능" : "대출불가";

    bestElem += '<div class="col-3 px-5">';
    bestElem += '<div class="card bg-dark text-white border-0 shadow">';
    bestElem += '<img src="'+ loanBest[i].image +'" class="img-fluid h-210p" alt="...">';
    bestElem += '<div class="card-img-overlay">';
    // bestElem += '<h5 class="card-title">'+ loanBest[i].title +'</h5>';
    // bestElem += '<p class="card-text '+ loanBest[i].text_color +'">'+ loanBest[i].working_status +'</p>';
    bestElem += '<span class="badge position-absolute top-0 start-100 translate-middle rounded-pill fs-6 fw-light '+ loanBest[i].text_color +'">'+ loanBest[i].working_status +'</span>';
    bestElem += '<div class="position-absolute bottom-0 end-0"><img src="'+ loanBest[i].link +'.qr" width="90"></div>';
    bestElem += '</div></div>';
    bestElem += '<p class="text-truncate">'+ loanBest[i].title +'</p>';
    bestElem += '</div>';
  }
  document.getElementById("loanBest_contents").innerHTML = bestElem;
});

ipcRenderer.on('getNewBook', function (event, arg) {
  let newBook = JSON.parse(arg);
  let newElem = '';

  console.log(newBook);

  for(let i in newBook) {
    newBook[i].text_color = newBook[i].working_status == "BOL112N" ? "bg-success" : "bg-danger";
    newBook[i].working_status = newBook[i].working_status == "BOL112N" ? "대출가능" : "대출불가";

    newElem += '<div class="col-3 px-5">';
    newElem += '<div class="card bg-dark text-white border-0 shadow">';
    newElem += '<img src="'+ newBook[i].image +'" class="img-fluid h-210p" alt="...">';
    newElem += '<div class="card-img-overlay">';
    // newElem += '<h5 class="card-title">'+ newBook[i].title +'</h5>';
    // newElem += '<p class="card-text '+ newBook[i].text_color +'">'+ newBook[i].working_status +'</p>';
    newElem += '<span class="badge position-absolute top-0 start-100 translate-middle rounded-pill fs-6 fw-light '+ newBook[i].text_color +'">'+ newBook[i].working_status +'</span>';
    newElem += '<div class="position-absolute bottom-0 end-0"><img src="'+ newBook[i].link +'.qr" width="90"></div>';
    newElem += '</div></div>';
    newElem += '<p class="text-truncate">'+ newBook[i].title +'</p>';
    newElem += '</div>';

  }
  document.getElementById("newBook_contents").innerHTML = newElem;
});
