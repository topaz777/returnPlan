const { ipcRenderer } = require('electron')

let displayDay = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

// ----------------------------------------------------------------------------

ipcRenderer.on('owKey', function (event, arg) {
  getWeather(JSON.parse(arg).owKey, "daegu");
});

ipcRenderer.on('return_plan_date', function (event, arg) {
  let return_plan_date = JSON.parse(arg);

  // document.getElementById("rpd_month").innerHTML = return_plan_date.year + ". " + return_plan_date.month + "월";
  document.getElementById("rpd_month").innerHTML = return_plan_date.month + "월";
  document.getElementById("rpd_date").innerHTML = return_plan_date.date;
  document.getElementById("rpd_day").innerHTML = displayDay[return_plan_date.day];
  // document.getElementById("cal_date_month").innerHTML = return_plan_date.month + "월";

  let date = new Date();
  yyyy = date.getFullYear();
  mm = date.getMonth() + 1;
  dd = date.getDate();
  day = date.getDay();

  let elem = [];

  // prefix
  if(day != 0) {
    for(let i=day-1; i>=0; i--) {
      let attr = "";
      date.setDate(date.getDate() - 1);

      if(date.getMonth()+1 != mm) attr = " disabled";
      elem.unshift('<div class="cal-btn"'+ attr +'>'+ date.getDate() +'</div>');
    }
  }

  date = new Date();
  date.setDate(date.getDate() - 1);

  let dateForCompare = return_plan_date.date;

  if(return_plan_date.month != mm) for(let i=mm; i<return_plan_date.month; i++) dateForCompare = new Date(2021, mm, 0).getDate() + return_plan_date.date;

  for(let i=dd; i<=dateForCompare; i++) {
    date.setDate(date.getDate() + 1);

    elem.push('<div class="cal-btn bg-warning">'+ date.getDate() +'</div>');
  }

  // suffix
  if(return_plan_date.day != 6) {
    for(let i=return_plan_date.day+1; i<=6; i++) {
      let attr = "";
      date.setDate(date.getDate() + 1);

      if(date.getMonth()+1 != return_plan_date.month) attr = " disabled";
      elem.push('<div class="cal-btn"'+ attr +'>'+ date.getDate() +'</div>');
    }
  }
  for(let i=elem.length; i<28; i++) {
    let attr = "";
    date.setDate(date.getDate() + 1);

    if(date.getMonth()+1 != return_plan_date.month) attr = " disabled";
    elem.push('<div class="cal-btn"'+ attr +'>'+ date.getDate() +'</div>');
  }

  let markup = '';
  for(let item of elem) markup += item;

  document.getElementById("cal_date_area").innerHTML = markup;
});


ipcRenderer.on('getLoanBest', function (event, arg) {
  let loanBest = JSON.parse(arg);
  let carouselEl = '';

  console.log(loanBest);

  for(let i in loanBest) {
    loanBest[i].text_color = loanBest[i].working_status == "BOL112N" ? "text-success" : "text-danger";
    loanBest[i].working_status = loanBest[i].working_status == "BOL112N" ? "대출가능" : "대출불가";

    if(i%2 == 0) {
      if(i == 0) {
        carouselEl += '<div class="carousel-item active"><div class="row row-cols-2">';
      } else {
        carouselEl += '<div class="carousel-item"><div class="row row-cols-2">';
      }
    }

    carouselEl += '<div class="col">';
    carouselEl += '<div class="card mb-3 rounded-3 border-0 shadow">';
    carouselEl += '<div class="row g-0">';
    carouselEl += '<div class="col-md-3">';
    carouselEl += '<img src="'+ loanBest[i].image +'" class="img-fluid rounded-start w-100 imgs">';
    carouselEl += '</div>';
    carouselEl += '<div class="col-md-9">';
    carouselEl += '<div class="card-body pb-0">';
    carouselEl += '<h6 class="card-title text-primary">'+ loanBest[i].publisher +'</h6>';
    carouselEl += '<h5 class="card-text text-truncate">'+ loanBest[i].title +'</h5>';
    carouselEl += '<h5 class="card-text text-muted text-truncate">'+ loanBest[i].author +'</h5>';
    carouselEl += '<p class="card-text text-truncate">'+ loanBest[i].pub_year +'년</p>';
    carouselEl += '<p class="card-text">'+ loanBest[i].callno +'</p>';
    carouselEl += '<p class="card-text '+ loanBest[i].text_color +'">'+ loanBest[i].working_status +'</p>';
    carouselEl += '<div class="position-absolute bottom-0 end-0 p-3"><img src="'+ loanBest[i].link +'.qr"></div>';
    carouselEl += '</div></div></div></div></div>';

    if(i%2 == 1) carouselEl += '</div></div>';

    // carouselEl += '<button class="carousel-control-prev" type="button" data-bs-target="#carousel_loanBest" data-bs-slide="prev">';
    // carouselEl += '<span class="carousel-control-prev-icon" aria-hidden="true"></span>';
    // carouselEl += '<span class="visually-hidden">Previous</span>';
    // carouselEl += '</button>';
    // carouselEl += '<button class="carousel-control-next" type="button" data-bs-target="#carousel_loanBest" data-bs-slide="next">';
    // carouselEl += '<span class="carousel-control-next-icon" aria-hidden="true"></span>';
    // carouselEl += '<span class="visually-hidden">Next</span>';
    // carouselEl += '</button>';

  }
  document.getElementById("loanBest_contents").innerHTML = carouselEl;
});

ipcRenderer.on('getNewBook', function (event, arg) {
  let newBook = JSON.parse(arg);
  let carouselEl = '';

  console.log(newBook);

  for(let i in newBook) {
    newBook[i].text_color = newBook[i].working_status == "BOL112N" ? "text-success" : "text-danger";
    newBook[i].working_status = newBook[i].working_status == "BOL112N" ? "대출가능" : "대출불가";

    if(i%2 == 0) {
      if(i == 0) {
        carouselEl += '<div class="carousel-item active"><div class="row row-cols-2">';
      } else {
        carouselEl += '<div class="carousel-item"><div class="row row-cols-2">';
      }
    }

    carouselEl += '<div class="col">';
    carouselEl += '<div class="card mb-3 rounded-3 border-0 shadow">';
    carouselEl += '<div class="row g-0">';
    carouselEl += '<div class="col-md-3">';
    carouselEl += '<img src="'+ newBook[i].image +'" class="img-fluid rounded-start w-100 imgs">';
    carouselEl += '</div>';
    carouselEl += '<div class="col-md-9">';
    carouselEl += '<div class="card-body pb-0">';
    carouselEl += '<h6 class="card-title text-primary">'+ newBook[i].publisher +'</h6>';
    carouselEl += '<h5 class="card-text text-truncate">'+ newBook[i].title +'</h5>';
    carouselEl += '<h5 class="card-text text-muted text-truncate">'+ newBook[i].author +'</h5>';
    carouselEl += '<p class="card-text text-truncate">'+ newBook[i].pub_year +'년</p>';
    carouselEl += '<p class="card-text">'+ newBook[i].callno +'</p>';
    carouselEl += '<p class="card-text '+ newBook[i].text_color +'">'+ newBook[i].working_status +'</p>';
    carouselEl += '<div class="position-absolute bottom-0 end-0 p-3"><img src="'+ newBook[i].link +'.qr"></div>';
    carouselEl += '</div></div></div></div></div>';

    if(i%2 == 1) carouselEl += '</div></div>';

    // carouselEl += '<button class="carousel-control-prev" type="button" data-bs-target="#carousel_newBook" data-bs-slide="prev">';
    // carouselEl += '<span class="carousel-control-prev-icon" aria-hidden="true"></span>';
    // carouselEl += '<span class="visually-hidden">Previous</span>';
    // carouselEl += '</button>';
    // carouselEl += '<button class="carousel-control-next" type="button" data-bs-target="#carousel_newBook" data-bs-slide="next">';
    // carouselEl += '<span class="carousel-control-next-icon" aria-hidden="true"></span>';
    // carouselEl += '<span class="visually-hidden">Next</span>';
    // carouselEl += '</button>';

  }
  document.getElementById("newBook_contents").innerHTML = carouselEl;
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
